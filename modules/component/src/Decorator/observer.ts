import {
  ObserverDecoratorUsedError,
  defineAccesser,
  defineProperty,
} from "@ocean/common";
import { Observer, ObserverOption } from "@ocean/reaction";
import { initComponentDefinition } from "../component/Component";

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
    // 创建观察者
    const observer = new Observer<T>({ ...option });
    defineAccesser(
      target,
      key,
      5,
      () => observer.get(),
      (value) => observer.set(value)
    );
    // 初始化组件定义
    const definition = initComponentDefinition(target);
    // 判断是否已存在观察者
    if (Reflect.has(definition.$observers, key)) {
      throw new ObserverDecoratorUsedError();
    }
    // 设置观察者
    defineProperty(definition.$observers, key, 7, observer);
  };
}
