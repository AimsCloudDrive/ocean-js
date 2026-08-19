import type { DefineComponent } from "vue";

/**
 * 模型设计器组件（Vue 3 + Vapor）。
 * 接收数据库连接信息；未提供 password 时弹出连接信息表单。
 */
export declare const ModelDesigner: DefineComponent<
  {
    title?: string;
    /** 自定义 API 适配器（优先级高于内置连接逻辑） */
    api?: ModelDesignerApi;
    bootstrap?: boolean;
    /** 数据库主机地址 */
    dbHost?: string;
    /** 数据库端口 */
    dbPort?: number;
    /** 默认业务数据库名 */
    db?: string;
    /** 数据库用户名 */
    user?: string;
    /** 数据库密码；未接收时为驱动弹出连接信息表单 */
    password?: string;
  },
  Record<never, unknown>,
  Record<never, unknown>
>;

export default ModelDesigner;

/** MongoDB 数据库连接信息。dbHost/dbPort/用户名/密码必填，db 用于指定默认业务库。 */
export interface MongoConnectionInfo {
  dbHost: string;
  dbPort: number;
  /** 默认业务数据库名 */
  db?: string;
  user: string;
  password: string;
}

export interface HttpModelDesignerApiOption {
  /** 后端基础地址，缺省时使用 location.origin + /api/model-designer */
  baseUrl?: string;
}

/** 创建与模型设计器后端契约一致的 REST API 适配器。 */
export declare function createHttpModelDesignerApi(
  option?: HttpModelDesignerApiOption
): ModelDesignerApi;

export interface ModelPosition {
  x: number;
  y: number;
}

export interface ModelField {
  id: string;
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  inherited?: boolean;
  fromModelId?: string;
}

export interface ModelNode extends ModelPosition {
  id: string;
  name: string;
  description?: string;
  color?: string;
  locked?: boolean;
  parentModelId?: string | null;
  childModelIds?: string[];
  showInheritedFields?: boolean;
  fields?: ModelField[];
  data?: Record<string, unknown>;
}

export interface RelationDirection {
  name: string;
  source: string;
  target: string;
  mappingType: "1" | "m" | "n";
}

export type ModelRelationKind = "one-to-one" | "one-to-many" | "many-to-many";

export interface ModelRelation {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
  kind?: ModelRelationKind;
  locked?: boolean;
  position?: ModelPosition;
  relationType: "relation" | "inherit";
  forward?: RelationDirection;
  reverse?: RelationDirection;
  data?: Record<string, unknown>;
}

export interface ModelDesignerCanvas {
  center: ModelPosition;
  scale: number;
  locked?: boolean;
}

export interface ModelDesignerBootstrap {
  canvas: ModelDesignerCanvas;
  models: ModelNode[];
  relations: ModelRelation[];
}

export type ModelPatch = Partial<
  Pick<
    ModelNode,
    | "id"
    | "name"
    | "description"
    | "color"
    | "locked"
    | "fields"
    | "data"
    | "showInheritedFields"
    | "parentModelId"
  >
>;

export type RelationPatch = Partial<
  Pick<ModelRelation, "name" | "kind" | "locked" | "data" | "forward" | "reverse">
> & { position?: ModelPosition };

export interface ModelDesignerApi {
  connect(connection: MongoConnectionInfo): Promise<void>;
  listDatabases(): Promise<string[]>;
  selectDatabase(db: string): void;
  bootstrap(): Promise<ModelDesignerBootstrap>;
  createModel(input: Omit<ModelNode, "id">): Promise<ModelNode>;
  updateModel(id: string, patch: ModelPatch): Promise<ModelNode | void>;
  updateModelPosition(id: string, position: ModelPosition): Promise<void>;
  deleteModel(id: string): Promise<void>;
  createRelation(input: Omit<ModelRelation, "id">): Promise<ModelRelation>;
  updateRelation(id: string, patch: RelationPatch): Promise<ModelRelation | void>;
  deleteRelation(id: string): Promise<void>;
  setLocked(locked: boolean): Promise<void>;
}

export declare const MODEL_COLORS: string[];
export declare const FIELD_TYPE_OPTIONS: string[];