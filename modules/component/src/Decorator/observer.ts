import { isComponent } from "./component";
import { ObserverDecoratorUsedError, defineProperty } from "@ocean/common";
import { getOrInitComponentDefinition } from "../component/Component";
import { Observer, ObserverOption } from "@ocean/reaction";

export function observer<T>(option: ObserverOption<T> = {}): PropertyDecorator {
  return function (target: object, key: string | symbol) {
    // 实例属性target为类的原型对象
    // 静态属性target为类构造器
    // 非静态
    if (typeof target === "function") {
      throw new ObserverDecoratorUsedError();
    }
    // 判断是否是component
    if (!isComponent(target)) {
      throw new ObserverDecoratorUsedError();
    }
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor) {
      throw new ObserverDecoratorUsedError();
    }
    // 非计算属性
    if (descriptor.get || descriptor.set) {
      throw new ObserverDecoratorUsedError();
    }
    // 非方法属性
    if (typeof descriptor.value !== "function") {
      throw new ObserverDecoratorUsedError();
    }
    // 初始化组件定义
    const definition = getOrInitComponentDefinition(target);
    // 判断是否已存在观察者
    if (Reflect.has(definition.$observers, key)) {
      throw new ObserverDecoratorUsedError();
    }
    // 创建观察者
    const observer = new Observer<unknown>({
      ...option,
    });
    // 设置观察者
    defineProperty(definition.$observers, key, 0, observer);
  };
}
