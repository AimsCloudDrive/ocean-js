import { assert } from "@msom/common";
import { ObjectId, WithId } from "mongodb";

export type Promiseable<T> = T | Promise<T>;

// 关系类型枚举
export enum RelationType {
  ONE = "One",
  MANY = "Many",
}

export enum ConditionType {
  COMP = "comp",
  AND = "and",
  OR = "or",
}

// 属性定义接口
export interface PropertyMeta {
  type: string;
  desc: string;
}

export type RelationName = string;
export type PropertyName = string;
// 关系配置接口
export interface RelationMeta {
  type: RelationType;
  correspondingModel: string;
  desc: string;
}

// 模型元数据接口
export interface ModelMeta {
  modelName: string;
  modelDesc: string;
  properties: Record<PropertyName, PropertyMeta>;
  relations: Record<RelationName, RelationMeta>;
  relating: Record<RelationName, WeakMap<ObjectId, ObjectId[]>>;
}

export interface QueryCondition {
  type: ConditionType;
  filter: <T extends object>(model: T) => boolean;
  clone(): QueryCondition;
}

export type CompPropValue = string | number | null | "undefined" | ObjectId;
export type CompConditionType =
  | "="
  | ">="
  | "<="
  | "<"
  | ">"
  | "!="
  | "in"
  | "nin"
  | "exist";

export class CompCondition implements QueryCondition {
  static is(condition: QueryCondition): condition is CompCondition {
    return condition.type === ConditionType.COMP;
  }
  static CompHandle = {
    "!=": (modelValue: unknown, targetValue: unknown) =>
      modelValue !== targetValue,
    "=": (modelValue: unknown, targetValue: unknown) =>
      modelValue === targetValue,
    ">": (modelValue: any, targetValue: any) => modelValue > targetValue,
    "<": (modelValue: any, targetValue: any) => modelValue < targetValue,
    "<=": (modelValue: any, targetValue: any) => modelValue <= targetValue,
    ">=": (modelValue: any, targetValue: any) => modelValue >= targetValue,
    in: (modelValue: unknown, targetValue: ReadonlyArray<unknown>) =>
      targetValue.includes(modelValue),
    nin: (modelValue: unknown, targetValue: ReadonlyArray<unknown>) =>
      !targetValue.includes(modelValue),
    exist: (model: object, propKey: string) => Reflect.has(model, propKey),
  } as const;
  declare type: ConditionType.COMP;
  declare compType: CompConditionType;
  declare propKey: string;
  declare value: CompPropValue | ReadonlyArray<CompPropValue>;
  constructor(
    compType: CompConditionType,
    propKey: string,
    value: CompPropValue | ReadonlyArray<CompPropValue>
  ) {
    this.type = ConditionType.COMP;
    this.compType = compType;
    this.propKey = propKey;
    this.value = value;
  }
  clone(): CompCondition {
    return new CompCondition(this.compType, this.propKey, this.value);
  }
  filter<T extends object>(model: T) {
    const { compType, propKey, value } = this;
    const h = CompCondition.CompHandle[compType];
    assert(h, "未知比较运算符");
    if (compType === "exist") {
      return (h as (typeof CompCondition.CompHandle)["exist"])(model, propKey);
    }
    return h(model[propKey], value as Parameters<typeof h>[1]);
  }
}
export class AndCondition implements QueryCondition {
  static is(condition: QueryCondition): condition is AndCondition {
    return condition.type === ConditionType.AND;
  }
  declare type: ConditionType.AND;
  declare conditions: QueryCondition[];
  constructor(conditions: QueryCondition[]) {
    this.type = ConditionType.AND;
    this.conditions = conditions;
  }
  clone(): AndCondition {
    return new AndCondition(this.conditions.map((v) => v.clone()));
  }
  filter<T extends object>(model: T): boolean {
    return this.conditions.every((condition) => condition.filter(model));
  }
}
export class OrCondition implements QueryCondition {
  static is(condition: QueryCondition): condition is OrCondition {
    return condition.type === ConditionType.OR;
  }
  declare type: ConditionType.OR;
  declare conditions: QueryCondition[];
  constructor(conditions: QueryCondition[]) {
    this.type = ConditionType.OR;
    this.conditions = conditions;
  }
  clone(): OrCondition {
    return new OrCondition(this.conditions.map((v) => v.clone()));
  }
  filter<T extends object>(model: T): boolean {
    return this.conditions.some((condition) => condition.filter(model));
  }
}

// 查询结果项接口
export interface QueryResultItem {
  _id: ObjectId;
  model: Record<string, any>;
  relates: Record<string, QueryResultItem[]>;
  children?: QueryResultItem[];
}

// 健康检查响应接口
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  dbStatus: string;
}

// 错误响应接口
export interface ErrorResponse<T = any> {
  code: 1;
  error: string;
  details?: T;
}

// 成功响应接口
export interface SuccessResponse<T = any> {
  code: 0;
  success: true;
  message?: string;
  data: T;
}
