import { assert } from "../assert";
import { defineProperty, setGlobalData } from "../global";
import { JSTypes } from "../types";

const componentGlobalData = setGlobalData("@msom/component", {
  componentDefinitionKey: Symbol("component_definition"),
  componentMap: new Map(),
});

export type ComponentDefinition = {
  componentName: string;
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
    [K in PropertyKey]: "observer" | "computed";
  };
};

/**
 * 初始化组件定义
 * 不会向上继续找原型对象的原型
 * @param prototype 组件类或类的原型对象
 * @returns 组件定义
 */
export function initComponentDefinition<T>(
  prototype: object | (new (...args: any[]) => T)
): ComponentDefinition {
  const { componentDefinitionKey } = componentGlobalData;
  prototype = (
    typeof prototype === "function" ? prototype.prototype : prototype
  ) as object;
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

/**
 * @param prototype 组件类或类的原型对象
 * @returns 组件定义
 */
export function getComponentDefinition<T>(
  prototype: object | (new (...args: any[]) => T)
): ComponentDefinition | undefined {
  const { componentDefinitionKey } = componentGlobalData;
  prototype = (
    typeof prototype === "function" ? prototype.prototype : prototype
  ) as object;
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

/**
 * 判断是否使用 @component 装饰器标记
 * @param ctor 类构造器或原型对象
 * @returns
 */
export function isComponent(
  ctor: ((...args: unknown[]) => unknown) | object
): boolean {
  const { componentDefinitionKey } = componentGlobalData;
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
export * from "./addStyle";
