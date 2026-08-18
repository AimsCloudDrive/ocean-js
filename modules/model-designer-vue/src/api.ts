import type {
  ModelDesignerApi,
  ModelDesignerBootstrap,
  ModelDesignerCanvas,
  ModelNode,
  ModelPatch,
  ModelPosition,
  ModelRelation,
  RelationDirection,
  RelationPatch,
} from "./types";

export interface HttpModelDesignerApiOption {
  baseUrl?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  code?: string;
  requestId: string;
}

type ServerModelData = Omit<ModelNode, "x" | "y" | "fields">;

interface ServerModel {
  META_TYPE: "model";
  model: ServerModelData;
  fields: ModelNode["fields"];
  position: ModelPosition;
}

interface ServerModelPatch {
  model?: Partial<ServerModelData>;
  fields?: ModelNode["fields"];
  position?: ModelPosition;
}

interface ServerRelationDirection {
  source: string;
  target: string;
  mappingType?: string;
  related?: Record<string, string[]>;
}

interface ServerRelation {
  META_TYPE: "relation";
  id: string;
  relationType: "relation" | "inherit";
  source?: string;
  target?: string;
  relationship?: Record<string, ServerRelationDirection>;
  position?: ModelPosition;
  name?: string;
  kind?: ModelRelation["kind"];
  locked?: boolean;
  data?: Record<string, unknown>;
}

interface ServerBootstrap {
  canvas: ModelDesignerCanvas & { META_TYPE: "base" };
  models: ServerModel[];
  relations: ServerRelation[];
}

function toModelNode(value: ServerModel): ModelNode {
  return {
    ...value.position,
    ...value.model,
    fields: value.fields,
  };
}

function toRelationDirection(
  name: string,
  dir: ServerRelationDirection
): RelationDirection {
  return {
    name,
    source: dir.source,
    target: dir.target,
    mappingType: (dir.mappingType as RelationDirection["mappingType"]) ?? "1",
  };
}

function toModelRelation(value: ServerRelation): ModelRelation {
  if (value.relationType === "inherit") {
    return {
      id: value.id,
      sourceId: value.source ?? "",
      targetId: value.target ?? "",
      relationType: "inherit",
      position: value.position,
      name: value.name,
      locked: value.locked,
      data: value.data,
    };
  }

  const entries = Object.entries(value.relationship ?? {});
  const [forwardName, forwardData] = entries[0] ?? ["", { source: "", target: "" }];
  const [reverseName, reverseData] = entries[1] ?? ["", { source: "", target: "" }];

  return {
    id: value.id,
    sourceId: forwardData.source,
    targetId: forwardData.target,
    relationType: "relation",
    position: value.position,
    name: value.name,
    kind: value.kind,
    locked: value.locked,
    data: value.data,
    forward: toRelationDirection(forwardName, forwardData),
    reverse: toRelationDirection(reverseName, reverseData),
  };
}

function modelPayload(input: Omit<ModelNode, "id">, id: string): ServerModel {
  const { x, y, fields, ...model } = input;
  return {
    META_TYPE: "model",
    model: { id, ...model },
    fields: fields ?? [],
    position: { x, y },
  };
}

function modelPatchPayload(patch: ModelPatch): ServerModelPatch {
  const { fields, ...model } = patch;
  return {
    ...(fields === undefined ? {} : { fields }),
    ...(Object.keys(model).length === 0 ? {} : { model }),
  };
}

function relationPayload(
  input: Omit<ModelRelation, "id">
): Omit<ServerRelation, "id" | "META_TYPE"> {
  if (input.relationType === "inherit") {
    return {
      relationType: "inherit",
      source: input.sourceId,
      target: input.targetId,
    };
  }

  const forward = input.forward;
  const reverse = input.reverse;
  const relationship: Record<string, ServerRelationDirection> = {};

  if (forward) {
    relationship[forward.name] = {
      source: forward.source,
      target: forward.target,
      mappingType: forward.mappingType,
    };
  }
  if (reverse) {
    relationship[reverse.name] = {
      source: reverse.source,
      target: reverse.target,
      mappingType: reverse.mappingType,
    };
  }

  return {
    relationType: "relation",
    relationship,
    position: input.position,
    name: input.name,
    kind: input.kind,
    locked: input.locked,
    data: input.data,
  };
}

function relationPatchPayload(patch: RelationPatch): Partial<ServerRelation> {
  const result: Partial<ServerRelation> = {};

  if (patch.position !== undefined) result.position = patch.position;
  if (patch.name !== undefined) result.name = patch.name;
  if (patch.kind !== undefined) result.kind = patch.kind;
  if (patch.locked !== undefined) result.locked = patch.locked;
  if (patch.data !== undefined) result.data = patch.data;

  if (patch.forward || patch.reverse) {
    const relationship: Record<string, ServerRelationDirection> = {};
    if (patch.forward) {
      relationship[patch.forward.name] = {
        source: patch.forward.source,
        target: patch.forward.target,
        mappingType: patch.forward.mappingType,
      };
    }
    if (patch.reverse) {
      relationship[patch.reverse.name] = {
        source: patch.reverse.source,
        target: patch.reverse.target,
        mappingType: patch.reverse.mappingType,
      };
    }
    result.relationship = relationship;
  }

  return result;
}

function createModelId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `model_${uuid?.replace(/-/g, "") ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

/** 创建与模型设计器后端契约一致的 REST API 适配器。 */
export function createHttpModelDesignerApi(
  option: HttpModelDesignerApiOption = {}
): ModelDesignerApi {
  const baseUrl = (option.baseUrl || "/api/model-designer").replace(/\/$/, "");
  let canvas: ModelDesignerCanvas = { center: { x: 0, y: 0 }, scale: 1 };
  const requestOption = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const request = async <T>(url: string, method = "GET", body?: unknown): Promise<T> => {
    const response = await fetch(`${baseUrl}${url}`, requestOption(method, body));
    const result = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !result.success) {
      throw new Error(result.message || `模型设计器接口请求失败：${response.status}`);
    }
    return result.data;
  };

  return {
    bootstrap: async () => {
      const result = await request<ServerBootstrap>("/bootstrap");
      canvas = {
        center: result.canvas.center,
        scale: result.canvas.scale,
        locked: result.canvas.locked,
      };
      return {
        canvas,
        models: result.models.map(toModelNode),
        relations: result.relations.map(toModelRelation),
      } satisfies ModelDesignerBootstrap;
    },
    createModel: async (input) =>
      toModelNode(
        await request<ServerModel>("/models", "POST", modelPayload(input, createModelId()))
      ),
    updateModel: async (id, patch: ModelPatch) =>
      toModelNode(
        await request<ServerModel>(`/models/${encodeURIComponent(id)}`, "PATCH", modelPatchPayload(patch))
      ),
    updateModelPosition: async (id, position: ModelPosition) => {
      await request<ServerModel>(`/models/${encodeURIComponent(id)}`, "PATCH", { position });
    },
    deleteModel: async (id) => {
      await request(`/models/${encodeURIComponent(id)}`, "DELETE");
    },
    createRelation: async (input) =>
      toModelRelation(
        await request<ServerRelation>("/relations", "POST", relationPayload(input))
      ),
    updateRelation: async (id, patch: RelationPatch) =>
      toModelRelation(
        await request<ServerRelation>(
          `/relations/${encodeURIComponent(id)}`,
          "PATCH",
          relationPatchPayload(patch)
        )
      ),
    deleteRelation: async (id) => {
      await request(`/relations/${encodeURIComponent(id)}`, "DELETE");
    },
    setLocked: async (locked) => {
      const result = await request<ModelDesignerCanvas & { META_TYPE: "base" }>(
        "/canvas",
        "PUT",
        { ...canvas, locked }
      );
      canvas = { center: result.center, scale: result.scale, locked: result.locked };
    },
  };
}
