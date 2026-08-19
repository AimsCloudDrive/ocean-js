import "./style.css";
import ModelDesigner from "./ModelDesigner.vue";

export default ModelDesigner;

export { createHttpModelDesignerApi } from "./api";
export type { HttpModelDesignerApiOption } from "./api";

export type {
  ModelDesignerApi,
  ModelDesignerBootstrap,
  ModelDesignerCanvas,
  ModelField,
  ModelNode,
  ModelPatch,
  ModelPosition,
  ModelRelation,
  ModelRelationKind,
  MongoConnectionInfo,
  RelationDirection,
  RelationPatch,
} from "./types";

export type { DesignerController } from "./composer/useDesigner";
export { MODEL_COLORS, FIELD_TYPE_OPTIONS } from "./composer/useDesigner";