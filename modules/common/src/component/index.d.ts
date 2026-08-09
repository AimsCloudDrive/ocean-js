import { JSTypes } from "../types";
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
export declare function initComponentDefinition<T>(prototype: object | (new (...args: any[]) => T)): ComponentDefinition;
/**
 * @param prototype 组件类或类的原型对象
 * @returns 组件定义
 */
export declare function getComponentDefinition<T>(prototype: object | (new (...args: any[]) => T)): ComponentDefinition | undefined;
/**
 * 判断是否使用 @component 装饰器标记
 * @param ctor 类构造器或原型对象
 * @returns
 */
export declare function isComponent(ctor: ((...args: unknown[]) => unknown) | object): boolean;
export * from "./addStyle";
