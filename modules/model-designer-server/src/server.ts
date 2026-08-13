import { createServer, type ServerRoute } from "@msom/http";
import type { Db, MongoClient } from "mongodb";
import { MetaRepository } from "./repositories/meta.repository.js";
import { CanvasService } from "./services/canvas.service.js";
import { DeleteService, type SelectionDeletePayload } from "./services/delete.service.js";
import { ModelService } from "./services/model.service.js";
import { RelationService } from "./services/relation.service.js";
import { assertPayload } from "./utils/errors.js";
import { route, success } from "./utils/response.js";

export interface ServerContext {
  client: MongoClient;
  db: Db;
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createRoutes(context: ServerContext): ServerRoute[] {
  const repository = new MetaRepository(context.db);
  const canvas = new CanvasService(repository);
  const models = new ModelService(context.db, repository);
  const relations = new RelationService(context.client, repository);
  const deletion = new DeleteService(context.client, context.db, repository);

  return [
    { path: "/bootstrap", method: "get", handlers: [route(async (_request, response) => success(response, { canvas: await canvas.get(), models: await models.list(), relations: await repository.listRelations() }))] },
    { path: "/canvas", method: "put", handlers: [route(async (request, response) => success(response, await canvas.save(request.body)))] },
    { path: "/models", method: "get", handlers: [route(async (request, response) => success(response, await models.list(request.query.includeInheritedFields !== "false")))] },
    { path: "/models", method: "post", handlers: [route(async (request, response) => { response.status(201); success(response, await models.create(request.body)); })] },
    { path: "/models/:modelId", method: "patch", handlers: [route(async (request, response) => success(response, await models.update(routeParam(request.params.modelId), request.body)))] },
    { path: "/models/:modelId", method: "delete", handlers: [route(async (request, response) => success(response, await deletion.deleteModels([routeParam(request.params.modelId)], request.query.deleteChildModels === "true")))] },
    { path: "/relations", method: "post", handlers: [route(async (request, response) => { response.status(201); success(response, await relations.create(request.body)); })] },
    { path: "/relations/:relationId", method: "patch", handlers: [route(async (request, response) => success(response, await relations.update(routeParam(request.params.relationId), request.body)))] },
    { path: "/relations/:relationId", method: "delete", handlers: [route(async (request, response) => { const relationId = routeParam(request.params.relationId); await relations.delete(relationId); success(response, { relationId }); })] },
    { path: "/selection/delete", method: "post", handlers: [route(async (request, response) => {
      const body = request.body as Partial<SelectionDeletePayload>;
      assertPayload(
        Array.isArray(body?.modelIds) && body.modelIds.every((id) => typeof id === "string") &&
        Array.isArray(body?.relationIds) && body.relationIds.every((id) => typeof id === "string") &&
        typeof body?.deleteChildModels === "boolean",
        "modelIds、relationIds 和 deleteChildModels 必填且类型必须正确",
      );
      success(response, await deletion.deleteSelection(body as SelectionDeletePayload));
    })] },
  ];
}

export function startServer(port: number, context: ServerContext) {
  return createServer(port, {
    routes: [{ path: "/api/model-designer", children: createRoutes(context) }],
    createHandle: ({ port: activePort }) => console.log(`模型设计器后端已启动：http://127.0.0.1:${activePort}`),
    printProxy: false,
  });
}
