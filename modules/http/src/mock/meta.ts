import { Collection } from "@msom/common";
import { uuidv7 } from "uuidv7";

export const MetaCollectionName = "__UNIQUE_META__";

export enum MetaType {
  Model = "model",
  Relationship = "relationship",
  Inheritance = "inheritance",
  View = "view",
}

export enum MetaStatus {
  // 正常
  Draft = "draft",
  // 创建
  Create = "create",
  // 删除
  Delete = "delete",
  // 更新
  Update = "update",
}

export type META_ID = string | number;

type Translation = {
  [key: string]: string;
};

type ModelName = string;

interface BaseDefinition {
  name: string;
  description?: string;
  translate?: Translation;
}

class BaseDefinition implements BaseDefinition {
  declare name: string;
  declare description?: string;
  declare translate?: {
    [key: string]: string;
  };
  constructor(option: BaseDefinition) {
    this.name = option.name;
    this.description = option.description;
    this.translate = option.translate;
  }
}

interface ModelFieldDefinition extends BaseDefinition {
  type: string;
}

export class ModelField extends BaseDefinition implements ModelFieldDefinition {
  declare type: string;
  constructor(option: ModelFieldDefinition) {
    super(option);
    this.type = option.type;
  }
}

interface ModelDefinition extends BaseDefinition {
  fields: Collection<ModelFieldDefinition>;
}
interface ModelOption extends BaseDefinition {
  fields?: Iterable<ModelFieldDefinition | ModelField>;
}

interface RelationshipDefinition extends BaseDefinition {
  from: ModelName;
  to: ModelName;
  isMany: boolean;
  // 如声明 from 为 modelA, to 为 modelB, isMany 为 true, 则表示 modelA 可以有多个 modelB
  // 具体数据之间的关联
  // modelA中的uuid_a1数据关联modelB中的uuid_b1数据
  // modelA中的uuid_a1数据关联modelB中的uuid_b2数据
  // 当查询uuid_a1的关联项时
  mapping?: {
    // modelA中的uuid_a1数据的数据库唯一标识
    from: any;
    // modelB中的uuid_b1数据的数据库唯一标识
    // 当isMany为true时，to可能有多个值，统一使用数组
    to: any[];
  }[];
}

interface InheritanceDefinition {
  parent: ModelName;
  child: ModelName;
}

interface BaseMeta {
  meta_id: META_ID;
  type: MetaType;
  meta_status: MetaStatus;
}

export interface ModelMeta extends BaseMeta {
  type: MetaType.Model;
  definition: ModelDefinition;
}
export interface RelationshipMeta extends BaseMeta {
  type: MetaType.Relationship;
  definition: RelationshipDefinition;
}
export interface InheritanceMeta extends BaseMeta {
  type: MetaType.Inheritance;
  definition: InheritanceDefinition;
}

export type Meta = ModelMeta | RelationshipMeta | InheritanceMeta;

export class Model extends BaseDefinition implements ModelDefinition {
  declare fields: Collection<ModelFieldDefinition>;
  constructor(option: ModelOption) {
    super(option);
    this.initFields(option.fields);
  }
  private initFields(fields?: Iterable<ModelFieldDefinition | ModelField>) {
    this.fields = new Collection<ModelFieldDefinition>((field) => field.name);
    if (!fields) {
      return;
    }
    for (const field of fields) {
      this.fields.add(
        field instanceof ModelField ? field : new ModelField(field),
      );
    }
  }
}

export class Relationship
  extends BaseDefinition
  implements RelationshipDefinition
{
  declare from: ModelName;
  declare to: ModelName;
  declare isMany: boolean;
  constructor(option: RelationshipDefinition) {
    super(option);
    this.from = option.from;
    this.to = option.to;
    this.isMany = option.isMany;
  }
}

export class Inheritance implements InheritanceDefinition {
  declare parent: ModelName;
  declare child: ModelName;
  constructor(option: InheritanceDefinition) {
    this.parent = option.parent;
    this.child = option.child;
  }
}

export function createModel(
  name: string,
  ...fields: (ModelFieldDefinition | ModelField)[]
) {
  return new Model({ name, fields });
}
export function createRelationship(
  name: string,
  from: ModelName,
  to: ModelName,
  isMany: boolean,
) {
  return new Relationship({ name, from, to, isMany });
}
export function createInheritance(parent: ModelName, child: ModelName) {
  return new Inheritance({ parent, child });
}
export function createModelField(name: string, type: string) {
  return new ModelField({ name, type });
}
