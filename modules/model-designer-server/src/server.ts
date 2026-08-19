import express, { type Request, type RequestHandler } from "express";
import type { Db, MongoClient } from "mongodb";
import { connectMongoClient, type MongoConnectionInfo } from "./db/mongo.js";
import { META_COLLECTION, MetaRepository } from "./repositories/meta.repository.js";
import { CanvasService } from "./services/canvas.service.js";
import { DeleteService, type SelectionDeletePayload } from "./services/delete.service.js";
import { ModelService } from "./services/model.service.js";
import { RelationService } from "./services/relation.service.js";
import { AppError, assertPayload } from "./utils/errors.js";
import { route, success } from "./utils/response.js";

type RequestMethod = "get" | "post" | "put" | "patch" | "delete";

type ServerRoute = {
  path: string;
  method?: RequestMethod;
  children?: ServerRoute[];
  handlers?: RequestHandler[];
};

export interface ServerContext {
  client: MongoClient;
  db: Db;
}

function registerRoutes(app: express.Application, routes: ServerRoute[], parentPath = ""): void {
  for (const route of routes) {
    const fullPath = parentPath + route.path;
    if (route.method) {
      app[route.method](fullPath, ...(route.handlers ?? []));
    }
    if (route.children) {
      registerRoutes(app, route.children, fullPath);
    }
  }
}

function createLocalServer(port: number, routes: ServerRoute[]): express.Application {
  const app = express();
  app.use((_, response, next) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, connectionKey, db");
    response.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    next();
  });
  app.options(/.*/, (_, response) => response.sendStatus(204));
  app.use(express.json());
  registerRoutes(app, routes);
  app.listen(port, () => console.log(`模型设计器后端已启动：http://127.0.0.1:${port}`));
  return app;
}

export class ConnectionManager {
  private readonly clients = new Map<string, MongoClient>();

  getConnectionKey(info: Pick<MongoConnectionInfo, "dbHost" | "dbPort">): string {
    return `${info.dbHost}:${info.dbPort}`;
  }

  async connect(info: MongoConnectionInfo): Promise<string> {
    const key = this.getConnectionKey(info);
    if (!this.clients.has(key)) {
      this.clients.set(key, await connectMongoClient(info));
    }
    return key;
  }

  requireClient(connectionKey: string): MongoClient {
    const client = this.clients.get(connectionKey);
    if (!client) throw new AppError(409, "NOT_CONNECTED", "数据库连接实例不存在或未连接");
    return client;
  }

  requireContext(connectionKey: string, dbName: string): ServerContext {
    assertDatabaseName(dbName);
    return { client: this.requireClient(connectionKey), db: this.requireClient(connectionKey).db(dbName) };
  }

  async listInitializedDatabases(connectionKey: string): Promise<string[]> {
    const client = this.requireClient(connectionKey);
    const databases = await client.db().admin().listDatabases({ nameOnly: true });
    const initialized: string[] = [];
    for (const database of databases.databases) {
      if (await isDatabaseInitialized(client.db(database.name))) initialized.push(database.name);
    }
    return initialized;
  }

  async initializeDatabase(
    connectionKey: string,
    dbName: string
  ): Promise<{ db: string; initialized: boolean; alreadyInitialized: boolean }> {
    assertDatabaseName(dbName);
    const db = this.requireClient(connectionKey).db(dbName);
    if (await isDatabaseInitialized(db)) {
      return { db: dbName, initialized: true, alreadyInitialized: true };
    }

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (collections.length > 0) {
      throw new AppError(409, "DATABASE_NOT_EMPTY", "数据库存在未初始化数据，不能初始化");
    }

    await new MetaRepository(db).saveCanvas({ META_TYPE: "base", center: { x: 0, y: 0 }, scale: 1 });
    return { db: dbName, initialized: true, alreadyInitialized: false };
  }

  async disconnect(): Promise<void> {
    const clients = [...this.clients.values()];
    this.clients.clear();
    await Promise.all(clients.map((client) => client.close().catch(() => undefined)));
  }
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function firstText(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
}

function requestBody(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
}

function headerText(request: Request, key: string): string {
  return firstText(request.headers[key.toLowerCase()]);
}

function requestText(request: Request, key: string): string {
  return headerText(request, key) || firstText(request.query[key]) || firstText(requestBody(request)[key]);
}

function businessBody<T extends Record<string, unknown>>(request: Request): T {
  const { connectionKey: _connectionKey, db: _db, ...body } = requestBody(request);
  return body as T;
}

function assertDatabaseName(dbName: string): void {
  assertPayload(typeof dbName === "string" && dbName.trim().length > 0, "db 必填");
}

function requestContext(manager: ConnectionManager, request: Request): ServerContext {
  const connectionKey = requestText(request, "connectionKey");
  const db = requestText(request, "db");
  assertPayload(connectionKey.trim().length > 0, "connectionKey 必填");
  assertDatabaseName(db);
  return manager.requireContext(connectionKey, db);
}

async function isDatabaseInitialized(db: Db): Promise<boolean> {
  const base = await db.collection(META_COLLECTION).findOne({ META_TYPE: "base" }, { projection: { _id: 1 } });
  return base !== null;
}

function buildServices(context: ServerContext) {
  const repository = new MetaRepository(context.db);
  return {
    repository,
    canvas: new CanvasService(repository),
    models: new ModelService(context.db, repository),
    relations: new RelationService(context.client, repository),
    deletion: new DeleteService(context.client, context.db, repository),
  };
}

export function createRoutes(manager: ConnectionManager): ServerRoute[] {
  return [
    {
      path: "/connect",
      method: "post",
      handlers: [
        route(async (request, response) => {
          const body = requestBody(request) as Partial<MongoConnectionInfo>;
          assertPayload(typeof body.dbHost === "string" && body.dbHost.trim().length > 0, "dbHost 必填");
          assertPayload(Number.isInteger(Number(body.dbPort)) && Number(body.dbPort) > 0, "dbPort 必填");
          assertPayload(typeof body.user === "string" && body.user.trim().length > 0, "用户名必填");
          assertPayload(typeof body.password === "string", "密码必填");

          const info: MongoConnectionInfo = {
            dbHost: body.dbHost.trim(),
            dbPort: Number(body.dbPort),
            user: body.user,
            password: body.password,
          };
          const connectionKey = await manager.connect(info);
          const db = typeof body.db === "string" && body.db.trim().length > 0 ? body.db.trim() : "";
          const initResult = db ? await manager.initializeDatabase(connectionKey, db) : undefined;
          success(response, {
            connected: true,
            connectionKey,
            dbHost: info.dbHost,
            dbPort: info.dbPort,
            ...(initResult
              ? {
                  db: initResult.db,
                  initialized: initResult.initialized,
                  alreadyInitialized: initResult.alreadyInitialized,
                }
              : {}),
          });
        }),
      ],
    },
    {
      path: "/databases",
      method: "get",
      handlers: [
        route(async (request, response) => {
          const connectionKey = requestText(request, "connectionKey");
          assertPayload(connectionKey.trim().length > 0, "connectionKey 必填");
          success(response, { connectionKey, databases: await manager.listInitializedDatabases(connectionKey) });
        }),
      ],
    },
    {
      path: "/databases/init",
      method: "post",
      handlers: [
        route(async (request, response) => {
          const connectionKey = requestText(request, "connectionKey");
          const db = requestText(request, "db");
          assertPayload(connectionKey.trim().length > 0, "connectionKey 必填");
          success(response, { connectionKey, ...(await manager.initializeDatabase(connectionKey, db)) });
        }),
      ],
    },
    {
      path: "/bootstrap",
      method: "get",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, {
            canvas: await s.canvas.get(),
            models: await s.models.list(),
            relations: await s.repository.listRelations(),
          });
        }),
      ],
    },
    {
      path: "/canvas",
      method: "get",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.canvas.get());
        }),
      ],
    },
    {
      path: "/canvas",
      method: "put",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.canvas.save(businessBody(request)));
        }),
      ],
    },
    {
      path: "/models",
      method: "get",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.models.list(request.query.includeInheritedFields !== "false"));
        }),
      ],
    },
    {
      path: "/models",
      method: "post",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          response.status(201);
          success(response, await s.models.create(businessBody(request)));
        }),
      ],
    },
    {
      path: "/models/:modelId",
      method: "get",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.models.getById(routeParam(request.params.modelId)));
        }),
      ],
    },
    {
      path: "/models/:modelId",
      method: "patch",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.models.update(routeParam(request.params.modelId), businessBody(request)));
        }),
      ],
    },
    {
      path: "/models/:modelId",
      method: "delete",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(
            response,
            await s.deletion.deleteModels(
              [routeParam(request.params.modelId)],
              request.query.deleteChildModels === "true"
            )
          );
        }),
      ],
    },
    {
      path: "/relations",
      method: "post",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          response.status(201);
          success(response, await s.relations.create(businessBody(request)));
        }),
      ],
    },
    {
      path: "/relations/:relationId",
      method: "patch",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          success(response, await s.relations.update(routeParam(request.params.relationId), businessBody(request)));
        }),
      ],
    },
    {
      path: "/relations/:relationId",
      method: "delete",
      handlers: [
        route(async (request, response) => {
          const s = buildServices(requestContext(manager, request));
          const relationId = routeParam(request.params.relationId);
          await s.relations.delete(relationId);
          success(response, { relationId });
        }),
      ],
    },
    {
      path: "/selection/delete",
      method: "post",
      handlers: [
        route(async (request, response) => {
          const body = businessBody<Partial<SelectionDeletePayload>>(request);
          assertPayload(
            Array.isArray(body?.modelIds) &&
              body.modelIds.every((id) => typeof id === "string") &&
              Array.isArray(body?.relationIds) &&
              body.relationIds.every((id) => typeof id === "string") &&
              typeof body?.deleteChildModels === "boolean",
            "modelIds、relationIds 和 deleteChildModels 必填且类型必须正确"
          );
          const s = buildServices(requestContext(manager, request));
          success(response, await s.deletion.deleteSelection(body as SelectionDeletePayload));
        }),
      ],
    },
  ];
}

export function startServer(port: number, manager: ConnectionManager) {
  return createLocalServer(port, [{ path: "/api/model-designer", children: createRoutes(manager) }]);
}
