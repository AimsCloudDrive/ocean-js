import {
  defineProperty,
  JSTypes,
  OptionDecoratorUsedError,
  initComponentDefinition,
  isComponent,
} from "@ocean/common";
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
      throw new OptionDecoratorUsedError({ NotStatic: true });
    }
    if (!isComponent(target)) {
      console.log(target);
      throw new OptionDecoratorUsedError({ NotInComponent: true });
    }
    // 原型对象上有key，则表示该属性是访问器属性或方法
    const descriptor = Object.getOwnPropertyDescriptor(target, propKey);
    if (descriptor) {
      // 非没有setter的计算属性
      if (descriptor.get && !descriptor.set) {
        throw new OptionDecoratorUsedError({ NotSetter: true });
      }
      // 非实例方法
      if (typeof descriptor.value === "function") {
        throw new OptionDecoratorUsedError({ NotMethod: true });
      }
    }
    const definition = initComponentDefinition(target);
    // 更新$option
    defineProperty(definition.$options, propKey, 7, {
      propName: propKey,
      type,
    });
  };
}
