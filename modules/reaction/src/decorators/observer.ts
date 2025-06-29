import {
  ObserverDecoratorUsedError,
  defineAccesser,
  defineProperty,
  initComponentDefinition,
  isComponent,
} from "@msom/common";
import { ObserverOption } from "../Observer";
import { _observer, generateIObserver } from "../utils";

export function observer<T>(option: ObserverOption<T> = {}): PropertyDecorator {
  return function (target, key) {
    // 实例属性target为类的原型对象
    // 静态属性target为类构造器
    // 非静态
    if (typeof target === "function") {
      throw new ObserverDecoratorUsedError({ NotStatic: true });
    }
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    // 原型对象上有key，则表示该属性是访问器属性或方法
    if (descriptor) {
      // 非方法属性
      if (typeof descriptor.value === "function") {
        throw new ObserverDecoratorUsedError({ NotMethod: true });
      }
      // 非访问器属性
      throw new ObserverDecoratorUsedError({ NotAccessor: true });
    }
    if (isComponent(target)) {
      // 初始化组件定义
      const definition = initComponentDefinition(target);
      // 判断是否已经标记为响应式
      if (Reflect.has(definition.$observers, key)) {
        throw new ObserverDecoratorUsedError({
          defineMessage() {
            return `the observer property ${String(key)} is exist.`;
          },
        });
      }
      // 标记
      defineProperty(definition.$observers, key, 7, "observer");
    }
    // 创建观察者
    defineAccesser(
      target,
      key,
      5,
      function (this: any) {
        // 每个对象实例的监听对象独立构造
        return generateIObserver.bind(this)(key, _observer, option).get();
      },
      function (this: any, value: T) {
        // 每个对象实例的监听对象独立构造
        return generateIObserver.bind(this)(key, _observer, option).set(value);
      }
    );
  };
}
