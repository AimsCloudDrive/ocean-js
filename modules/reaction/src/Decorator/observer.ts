import {
  ObserverDecoratorUsedError,
  defineAccesser,
  defineProperty,
  initComponentDefinition,
} from "@ocean/common";
import { _observer, generateIObserver } from "../utils";
import { ObserverOption } from "../Observer";

export function observer<T>(option: ObserverOption<T> = {}): PropertyDecorator {
  return function (target, key) {
    // 实例属性target为类的原型对象
    // 静态属性target为类构造器
    // 非静态
    if (typeof target === "function") {
      throw new ObserverDecoratorUsedError();
    }
    //// 判断是否是component
    // if (!isComponent(target)) {
    //   throw new ObserverDecoratorUsedError();
    // }
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      // 非计算属性
      if (descriptor.get || descriptor.set) {
        throw new ObserverDecoratorUsedError();
      }
      // 非方法属性
      if (typeof descriptor.value === "function") {
        throw new ObserverDecoratorUsedError();
      }
    }
    // 初始化组件定义
    const definition = initComponentDefinition(target);
    // 判断是否已经标记为响应式
    if (Reflect.has(definition.$observers, key) && definition.$observers[key]) {
      throw new ObserverDecoratorUsedError();
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
    // 标记
    defineProperty(definition.$observers, key, 7, true);
  };
}
