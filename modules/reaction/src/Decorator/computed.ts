import {
  ObserverDecoratorUsedError,
  defineProperty,
  initComponentDefinition,
} from "@ocean/common";
import { _computed, generateIObserver } from "../utils";
import { ComputedOption } from "../Computed";

/**
 * 计算属性装饰器
 * 用于get计算属性和无参函数上
 * @returns MethodDecorator
 */
export function computed<T>(
  option: Omit<ComputedOption<T>, "method">
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
      throw new ObserverDecoratorUsedError();
    }
    if (!descriptor) {
      throw new ObserverDecoratorUsedError();
    }
    let method = descriptor.value as (() => T) | undefined;
    let methodType: "value" | "get" = "value";
    if (typeof method !== "function") {
      method = descriptor.get;
      methodType = "get";
    }
    if (typeof method !== "function") {
      throw new ObserverDecoratorUsedError();
    }
    if (method.length > 0) {
      console.warn("computed的函数应该是无参函数");
      return;
    }
    // 初始化组件定义
    const definition = initComponentDefinition(target);
    // 判断是否已经标记为响应式
    if (Reflect.has(definition.$observers, key) && definition.$observers[key]) {
      throw new ObserverDecoratorUsedError();
    }
    const _method = method;
    descriptor[methodType] = function (this: any) {
      const create = generateIObserver.bind(this);
      create(key, _computed, {
        ...option,
        method: _method.bind(this),
      }).get();
    } as T & (() => T);
    // 标记
    defineProperty(definition.$observers, key, 7, true);
  };
}
