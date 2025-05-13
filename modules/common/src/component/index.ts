import { assert } from "../assert";
import { getGlobalData, defineProperty, setGlobalData } from "../global";
import { JSTypes } from "../types";

setGlobalData("@ocean/component", {
  componentDefinitionKey: Symbol("component_definition"),
  componentMap: new Map(),
});

export type ComponentDefinition = {
  componentName: string;
  $preOptions: {
    [K in PropertyKey]: {
      propName: string;
      type: JSTypes | "array";
    };
  };
  $options: {
    [K in PropertyKey]: {
      propName: string;
      type: JSTypes | "array";
    };
  };
  $events: {
    [K in PropertyKey]: JSTypes;
  };
  $observers: {
    [K in PropertyKey]: boolean;
  };
};

/**
 * 初始化组件定义
 * 不会向上继续找原型对象的原型
 * @param prototype 组件类的原型对象
 * @returns 组件定义
 */
export function initComponentDefinition(
  prototype: object
): ComponentDefinition {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  // 原型对象的原型
  const prototype_prototype = Object.getPrototypeOf(prototype);
  //
  const prototype_prototype_definition =
    getComponentDefinition(prototype_prototype);
  try {
    // 置空原型
    Object.setPrototypeOf(prototype, null);
    // 获取组件定义
    let definition: ComponentDefinition | undefined = Reflect.get(
      prototype,
      componentDefinitionKey
    );
    // 如果组件定义不存在，则初始化组件定义
    if (!definition) {
      definition = Object.create(null);
      assert(definition);
      Object.assign(definition, {
        // 将组件的属性、事件、监听器通过原型链接起来
        $options: Object.create(
          prototype_prototype_definition?.["$options"] || null
        ),
        $events: Object.create(
          prototype_prototype_definition?.["$events"] || null
        ),
        $observers: Object.create(
          prototype_prototype_definition?.["$observers"] || null
        ),
        $preOptions: Object.create(null),
      });
      // 设置组件定义
      defineProperty(prototype, componentDefinitionKey, 0, definition);
    }
    return definition;
  } finally {
    // 恢复原型
    Object.setPrototypeOf(prototype, prototype_prototype);
  }
}
export function getComponentDefinition(
  prototype: object
): ComponentDefinition | undefined {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  const oldProptotype = Object.getPrototypeOf(prototype);
  try {
    // 置空原型
    Object.setPrototypeOf(prototype, null);
    // 获取组件定义
    return Reflect.get(prototype, componentDefinitionKey);
  } finally {
    // 恢复原型
    Object.setPrototypeOf(prototype, oldProptotype);
  }
}
