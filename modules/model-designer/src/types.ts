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
  /** 是否为继承字段（查询时由后端注入，前端只读） */
  inherited?: boolean;
  /** 继承字段来源模型 ID */
  fromModelId?: string;
}

/** 画布中的模型节点。 */
export interface ModelNode<T = Record<string, unknown>> extends ModelPosition {
  id: string;
  name: string;
  description?: string;
  /** 节点边框颜色 */
  color?: string;
  locked?: boolean;
  /** 继承来源模型 ID，null 表示无继承 */
  parentModelId?: string | null;
  /** 继承该模型的子模型 ID 列表 */
  childModelIds?: string[];
  /** 是否显示继承字段（首次进入默认显示） */
  showInheritedFields?: boolean;
  fields?: ModelField[];
  data?: T;
}

/** 关系方向（A→B 或 B→A）的数据。 */
export interface RelationDirection {
  /** 该方向关系名称 */
  name: string;
  /** 源模型 ID */
  source: string;
  /** 目标模型 ID */
  target: string;
  /** 映射类型：1 / m / n */
  mappingType: "1" | "m" | "n";
}

export type ModelRelationKind = "one-to-one" | "one-to-many" | "many-to-many";

/** 模型之间的连线关系。 */
export interface ModelRelation<T = Record<string, unknown>> {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
  kind?: ModelRelationKind;
  locked?: boolean;
  /** 信息框中心坐标 */
  position?: ModelPosition;
  /** 关系类型：普通关系 / 继承关系 */
  relationType: "relation" | "inherit";
  /** A→B 方向数据 */
  forward?: RelationDirection;
  /** B→A 方向数据 */
  reverse?: RelationDirection;
  data?: T;
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
  Pick<ModelNode, "id" | "name" | "description" | "color" | "locked" | "fields" | "data" | "showInheritedFields" | "parentModelId">
>;

export type RelationPatch = Partial<
  Pick<ModelRelation, "name" | "kind" | "locked" | "data" | "forward" | "reverse">
> & {
  position?: ModelPosition;
};

/** 后端适配契约；位置更新与其他变更分开，便于落实提交时机。 */
export interface ModelDesignerApi {
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

export interface ModelDesignerOption {
  title?: string;
  className?: string;
}
