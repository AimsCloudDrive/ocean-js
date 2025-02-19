import {
  ComponentDecoratorUsedError,
  JSTypes,
  getGlobalData,
} from "@ocean/common";
import { getOrInitComponentDefinition } from "../component/Component";

export type ComponentOption = {
  events?: {
    [K in string]: JSTypes;
  };
};

/**
 * 仅附着在类上
 * @param name
 * @param option
 * @returns
 */
export function component(
  name: Exclude<string, "">,
  option?: ComponentOption
): ClassDecorator {
  const { componentMap } = getGlobalData("@ocean/component") as {
    componentMap: Map<string, object>;
  };
  const isExist = componentMap.has(name);
  if (isExist) throw Error(`Component '${name}' is already exist.`);
  return function (ctor, ...args: unknown[]) {
    // 非类构造器
    if (typeof ctor !== "function" || (args && args.length > 0)) {
      throw new ComponentDecoratorUsedError();
    }
    // ctor为类的构造器,获取其原型对象
    // 初始化组件定义
    const definition = getOrInitComponentDefinition(ctor.prototype);
    // 设置组件名称
    definition.componentName = name;
    // 绑定声明事件
    if (option?.events) {
      Object.entries(option.events).forEach(([ek, type]) => {
        definition.$events[ek] = type;
      });
    }
    // 记录组件
    componentMap.set(name, ctor);
  };
}

/**
 * 判断是否使用 @component 装饰器标记
 * @param ctor 类构造器或原型对象
 * @returns
 */
export function isComponent(
  ctor: ((...args: unknown[]) => unknown) | object
): boolean {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  // 如果是类构造器，则获取其原型对象
  const target = typeof ctor === "function" ? ctor.prototype : ctor;
  // 保存原型对象的原型
  const prototype = Object.getPrototypeOf(target);
  try {
    // 置空原型
    Object.setPrototypeOf(target, null);
    // 判断原型对象有没有组件定义
    return Reflect.has(target, componentDefinitionKey);
  } finally {
    // 恢复原型
    Object.setPrototypeOf(target, prototype);
  }
}
