import {
  defineProperty,
  JSTypes,
  OcPromise,
  OptionDecoratorUsedError,
} from "@ocean/common";
import { isComponent } from "./component";
import { initComponentDefinition } from "../component/Component";
/**
 * 仅允许附着在实例属性或实例访问器属性（有setter）
 * @param type
 * @returns
 */
export function option(option: { type?: JSTypes } = {}): PropertyDecorator {
  return function (target, propKey) {
    const { type = "unknown" } = option;
    // 实例属性target为类的原型对象
    // 静态属性target为类构造器
    // 非静态
    if (typeof target === "function") {
      console.error("静态");
      throw new OptionDecoratorUsedError();
    }
    // 获取属性描述符
    const descriptor = Object.getOwnPropertyDescriptor(target, propKey);
    if (descriptor) {
      // 非没有setter的计算属性
      if (descriptor.get && !descriptor.set) {
        console.error("计算属性没有setter");
        throw new OptionDecoratorUsedError();
      }
      // 非实例方法
      if (typeof descriptor.value === "function") {
        console.error("非实例方法");
        throw new OptionDecoratorUsedError();
      }
    }
    const definition = initComponentDefinition(target);
    // 更新$option
    defineProperty(definition.$preOptions, propKey, 7, {
      propName: propKey,
      type,
    });
  };
}
