import {
  ComponentDecoratorUsedError,
  JSTypes,
  getGlobalData,
  initComponentDefinition,
} from "@msom/common";

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
  const { componentMap } = getGlobalData("@msom/component") as {
    componentMap: Map<string, object>;
  };
  const isExist = componentMap.has(name);
  if (isExist)
    throw new ComponentDecoratorUsedError({
      defineMessage: `Component '${name}' is already exist.`,
    });
  return function (ctor) {
    // 非类构造器
    if (typeof ctor !== "function") {
      throw new ComponentDecoratorUsedError({ NotClass: true });
    }
    // 初始化组件定义
    const definition = initComponentDefinition(ctor.prototype);
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
