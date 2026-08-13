import type { Document } from "mongodb";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasMeta extends Document {
  META_TYPE: "base";
  center: Point;
  scale: number;
  locked?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  color?: string;
  locked?: boolean;
  parentModelId: string | null;
  childModelIds: string[];
  showInheritedFields?: boolean;
}

export interface ModelMeta extends Document {
  META_TYPE: "model";
  model: ModelInfo;
  fields: Array<Record<string, unknown>>;
  position: Point;
}

export interface RelationMeta extends Document {
  META_TYPE: "relation";
  id: string;
  relationType: "relation" | "inherit";
  source?: string;
  target?: string;
  relationship?: Record<string, Record<string, unknown>>;
  position?: Point;
  name?: string;
  kind?: "one-to-one" | "one-to-many" | "many-to-many";
  locked?: boolean;
  data?: Record<string, unknown>;
}

export type MetaDocument = CanvasMeta | ModelMeta | RelationMeta;
