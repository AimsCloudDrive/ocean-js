import { Filter, FilterOperators } from "mongodb";
import { DBContext } from "./DBContext";
import { QueryModel, QueryProtocol, and, comp } from "./QueryProtocolBuilder";
import {
  AndCondition,
  CompCondition,
  CompConditionType,
  OrCondition,
  QueryCondition,
  QueryResultItem,
} from "./interfaces";
import { assert } from "@msom/common";

/*
TODO class QueryExecutor => class QueryEngine
更新FilterTypeMap，将之替换成枚举类型，枚举键是MongoDB所有的filter键与之对应的符号，不适合使用符号表示的则使用英文，枚举值则为相应的原始filter属性名

解析传入的Query查询对象，首先查询meta集合，遍历查询对象，是否所有的查询模型和关系是否存在，如果meta中不存在就抛出不存在错误
meta中都检查通过之后，将Query查询对象构建成MongoDB的查询语句，执行查询，然后将查询结构构建成Query查询条件中模型的层级结构，通过关系查询的就是下一层

*/
const FilterTypeMap: Record<CompConditionType, keyof FilterOperators<unknown>> =
  {
    "!=": "$ne",
    "=": "$eq",
    "<": "$lt",
    "<=": "$lte",
    ">": "$gt",
    ">=": "$gte",
    in: "$in",
    nin: "$nin",
    exist: "$exist",
  };

export class QueryExecutor {
  private cache = new Map<string, Promise<QueryResultItem[]>>();
  private declare dbContext: DBContext;
  constructor(option: { dbContext: DBContext }) {
    Object.assign(option);
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async execute(protocol: QueryProtocol): Promise<QueryResultItem[]> {
    const cacheKey = this.generateCacheKey(protocol);
    const cache = this.cache.get(cacheKey);
    if (cache) {
      return cache;
    }

    const result = this.processProtocol(protocol);
    this.cache.set(cacheKey, result);
    return result;
  }
  resolveCondition(condition: QueryCondition | undefined): Filter<unknown> {
    if (!condition) {
      return {};
    }
    if (CompCondition.is(condition)) {
      return {
        [condition.propKey]: {
          [FilterTypeMap[condition.compType]]:
            condition.compType === "exist" ? true : condition.value,
        },
      };
    }
    return {
      [AndCondition.is(condition) ? "$and" : "$or"]: (
        condition as AndCondition | OrCondition
      ).conditions.map(this.resolveCondition),
    };
  }
  private async processProtocol(
    protocol: QueryProtocol
  ): Promise<QueryResultItem[]> {
    const process = async (option: QueryModel) => {
      const { modelName, conditions: condition } = option;
      const collection = this.dbContext.getCollection(modelName);
      const models: QueryResultItem[] = (
        await collection.find(this.resolveCondition(condition)).toArray()
      ).map((_model) => {
        const { _id, ...model } = _model;
        return {
          _id,
          model,
          relates: {},
        };
      });
      /**
       * TODO
       * 判断查询条件有没有关系，即relates是否为空对象
       * 否，则直接返回models
       * 有关系查询，则找到对应模型的meta元数据，处理meta.relations中存在的搞关系
       * 在meta.relating中找到对应关系，根据实例id去找到关联的实例id
       * 并生成比对id的condition和查询条件中对应的RelateModel的condition合并
       * 生成新的QueryModel，包含对应RelateModel的relates和meta中对应关系的modelName和合并后的condition
       * 递归处理新的QueryModel，将返回结果添加在当前model实例的relates中
       */
      const relateKeys = Reflect.ownKeys(option.relates) as string[];
      if (relateKeys.length === 0) {
        return models;
      }
      const relateHandles = models.map(async ({ _id, relates }) => {
        const handles = relateKeys
          .map((relationName) => {
            const meta = this.dbContext.getModelMeta(modelName);
            assert(meta, "unknown modelName: " + modelName);
            if (
              !Reflect.has(meta.relations, relationName) ||
              !Reflect.has(meta.relating, relationName)
            ) {
              return;
            }
            const relationMeta = Reflect.get(
              meta.relations,
              relationName,
              meta.relations
            );
            if (!relationMeta) {
              return;
            }
            const relating = meta.relating[relationName].get(_id);
            if (!relating) {
              return;
            }
            const relateModel = option.relates[relationName];
            const { correspondingModel } = relationMeta;
            const newOption = new QueryModel(correspondingModel);
            newOption.relates = relateModel.relates;
            newOption.conditions = and(
              ...([relateModel.conditions, comp("in", "_id", relating)].filter(
                Boolean
              ) as QueryCondition[])
            );
            return process(newOption).then((relations) => {
              relates[relationName] = relations;
            });
          })
          .filter(Boolean) as Promise<unknown>[];
        return Promise.all(handles);
      });
      await Promise.all(relateHandles);
      return models;
    };
    return await process(protocol.option);
  }

  private generateCacheKey(protocol: QueryProtocol): string {
    return JSON.stringify(protocol);
  }
}
