import {
  ComputedDecoratorUsedError,
  defineProperty,
  initComponentDefinition,
  isComponent,
} from "@msom/common";
import { _computed, generateIObserver } from "../utils";
import { ComputedOption } from "../Computed";

/**
 * 计算属性装饰器
 * 用于get计算属性和无参函数上
 * @returns MethodDecorator
 */
export function computed<T>(
  option?: Omit<ComputedOption<T>, "method">
): (
  target: object,
  key: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void {
  return function (target, key, descriptor) {
    // 实例属性target为类的原型对象
    // 静态属性target为类构造器
    // 非静态
    if (typeof target === "function") {
      throw new ComputedDecoratorUsedError({ NotStatic: true });
    }
    if (!descriptor) {
      throw new ComputedDecoratorUsedError({ NotProperty: true });
    }
    let method = descriptor.value as (() => T) | undefined;
    let methodType: "value" | "get" = "value";
    if (typeof method !== "function") {
      method = descriptor.get;
      methodType = "get";
    }
    if (typeof method !== "function") {
      throw new ComputedDecoratorUsedError({
        defineMessage: () => {
          return `the method or accessor for getter ${String(
            key
          )} not be function.`;
        },
      });
    }
    if (method.length > 0) {
      console.warn(
        new ComputedDecoratorUsedError({
          defineMessage: () => {
            return "the computed effct method should be no argument";
          },
        }).message
      );
      return;
    }
    if (isComponent(target)) {
      // 初始化组件定义
      const definition = initComponentDefinition(target);
      // 判断是否已经标记为响应式
      if (
        Reflect.has(definition.$observers, key) &&
        definition.$observers[key]
      ) {
        throw new ComputedDecoratorUsedError({
          defineMessage: () => {
            return `the computed method or computed property ${String(
              key
            )} is exist.`;
          },
        });
      }
      // 标记
      defineProperty(definition.$observers, key, 7, "computed");
    }
    const _method = method;
    descriptor[methodType] = function (this: any) {
      const create = generateIObserver.bind(this);
      return create(key, _computed, {
        ...option,
        method: _method.bind(this),
      }).get();
    } as T & (() => T);
    const setter = descriptor.set;
    if (setter) {
      descriptor.set = function (this: any, value: T) {
        setter.call(this, value);
        const create = generateIObserver.bind(this);
        create(key, _computed, {
          ...option,
          method: _method.bind(this),
        }).notify();
      };
    }
  };
}
