import { ObjectId } from "mongodb";
import {
  QueryCondition,
  CompCondition,
  CompConditionType,
  AndCondition,
  OrCondition,
  CompPropValue,
} from "./interfaces";
export enum ModelType {
  RELATE = "relate",
  MODEL = "model",
}

export interface ModelHandler {
  condition(condition: QueryCondition): this;
  relate(
    relateName: string,
    callback?: ((relateModel: RelateModelHandler) => void) | undefined
  ): this;
}
export interface RelateModelHandler extends ModelHandler {
  recursive(count: number): this;
}

export abstract class Model implements ModelHandler {
  type: ModelType;
  conditions: QueryCondition | undefined;
  relates: { [K in string]: Model };
  children?: RelateModel;
  condition(condition: QueryCondition): this {
    this.conditions = condition;
    return this;
  }
  relate(
    relateName: string,
    callback?: ((relateModel: RelateModel) => void) | undefined
  ): this {
    const model = new RelateModel(relateName);
    callback?.(model);
    return this;
  }
}

export class QueryModel extends Model {
  declare type: ModelType.MODEL;
  declare modelName: string;
  constructor(modelName: string) {
    super();
    this.type = ModelType.MODEL;
    this.modelName = modelName;
  }
  static is(model: Model): model is QueryModel {
    return model.type === ModelType.MODEL;
  }
}
export class RelateModel extends Model implements RelateModelHandler {
  declare type: ModelType.RELATE;
  declare relateName: string;
  constructor(relateName: string) {
    super();
    this.type = ModelType.RELATE;
    this.relateName = relateName;
  }

  recursive(count: number) {
    let that: RelateModel = this;
    for (let i = 1; i < count; i++) {
      const model = new RelateModel(this.relateName);
      model.conditions = that.conditions?.clone();
      that.relates[this.relateName] = model;
      that = model;
    }
    return this;
  }
  static is(model: Model): model is RelateModel {
    return model.type === ModelType.RELATE;
  }
}

export interface QueryProtocol {
  start: string;
  option: QueryModel;
}

export class QueryProtocolBuilder {
  private startModel: string;
  private rootModel: QueryModel;
  private currentModel: QueryModel | RelateModel;

  constructor(startModel: string) {
    this.startModel = startModel;
    this.currentModel = this.rootModel = new QueryModel(startModel);
  }
  model(modelName: string, callback?: (model: ModelHandler) => void) {
    if (!modelName) {
      callback?.(this.rootModel);
    } else {
      // TODO
    }
    return this;
  }
  relate(relateName: string, callback?: (model: RelateModelHandler) => void) {
    const model = new RelateModel(relateName);
    const relate = this.relate.bind(this);
    model.recursive = function (count) {
      for (let i = 1; i < count; i++) {
        relate(relateName);
      }
      return this;
    };
    this.currentModel.children = model;
    this.currentModel = model;
    callback?.(model);
    return this;
  }

  protocol(): QueryProtocol {
    return {
      start: this.startModel,
      option: this.rootModel,
    };
  }
}

export function comp(
  compType: CompConditionType,
  propKey: string,
  value: CompPropValue | ReadonlyArray<CompPropValue>
): CompCondition {
  return new CompCondition(compType, propKey, value);
}
export function and(...conditions: QueryCondition[]): AndCondition {
  return new AndCondition(conditions);
}
export function or(...conditions: QueryCondition[]): OrCondition {
  return new OrCondition(conditions);
}
