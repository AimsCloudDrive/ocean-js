declare const ADD_IMPLEMENT: "addImplement";
/**
 * TypeScript 基础类型的联合类型
 */
type TSTypeUnion = string | number | boolean | undefined | object | symbol | bigint | void;
/**
 * TypeScript 类型到类型名称的映射
 */
type TypeToName<T extends TSTypeUnion> = T extends string ? "string" : T extends number ? "number" : T extends boolean ? "boolean" : T extends undefined ? "undefined" : T extends (...args: unknown[]) => unknown ? "function" : T extends symbol ? "symbol" : T extends bigint ? "bigint" : T extends object ? "object" : T extends void ? "void" : never;
/**
 * 获取除最后一个元素外的所有元素类型
 */
type DropLast<T extends TSTypeUnion[]> = T extends [...infer Rest, unknown] ? Rest extends TSTypeUnion[] ? Rest : [] : [];
/**
 * 获取数组的最后一个元素类型
 */
type Last<T extends TSTypeUnion[]> = T extends [...unknown[], infer L] ? L extends TSTypeUnion ? L : never : never;
type TSArrayToNameArray<T extends TSTypeUnion[]> = T extends [
    infer R,
    ...infer Rest
] ? [
    ...(R extends TSTypeUnion ? [TypeToName<R>] : []),
    ...(Rest extends TSTypeUnion[] ? TSArrayToNameArray<Rest> : [])
] : [];
/**
 * 可重载函数的类型定义
 */
type OverLoadableFunction<T extends TSTypeUnion[][]> = {
    (...args: DropLast<T[number]>): Last<T[number]>;
    [ADD_IMPLEMENT]: <U extends T[number]>(...impl: [
        ...TSArrayToNameArray<DropLast<U>>,
        (...args: DropLast<U>) => Last<U>
    ]) => OverLoadableFunction<T>;
};
type CreateOverloadImpls<T extends TSTypeUnion[][]> = {
    [K in keyof T]: T[K] extends TSTypeUnion[] ? [
        ...TSArrayToNameArray<DropLast<T[K]>>,
        (...args: DropLast<T[K]>) => Last<T[K]>
    ] : never;
};
/**
 * 创建一个可重载的函数
 * @template T 类型数组的数组，每个数组最后一个类型为返回值类型
 */
export declare function createOverload<T extends TSTypeUnion[][]>(impls?: CreateOverloadImpls<T>): OverLoadableFunction<T>;
export {};
