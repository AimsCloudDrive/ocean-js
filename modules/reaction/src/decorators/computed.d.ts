import { ComputedOption } from "../Computed";
/**
 * 计算属性装饰器
 * 用于get计算属性和无参函数上
 * @returns MethodDecorator
 */
export declare function computed<T>(option?: Omit<ComputedOption<T>, "method">): (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
