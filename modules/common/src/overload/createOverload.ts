import { Collection } from "../collection";
import { defineProperty } from "../global";
import { assert } from "../assert";

const TYPE_SPLITOR = ",";
const OVERlOAD_KEY = Symbol("overload");
const ADD_IMPLEMENT = "addImplement" as const;

/**
 * TypeScript 基础类型的联合类型
 */
type TSTypeUnion =
  | string
  | number
  | boolean
  | undefined
  | object
  | symbol
  | bigint
  | void;

/**
 * TypeScript 类型到类型名称的映射
 */
type TypeToName<T extends TSTypeUnion> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends undefined
  ? "undefined"
  : T extends (...args: unknown[]) => unknown
  ? "function"
  : T extends symbol
  ? "symbol"
  : T extends bigint
  ? "bigint"
  : T extends object
  ? "object"
  : T extends void
  ? "void"
  : never;

/**
 * 获取除最后一个元素外的所有元素类型
 */
type DropLast<T extends TSTypeUnion[]> = T extends [...infer Rest, unknown]
  ? Rest extends TSTypeUnion[]
    ? Rest
    : []
  : [];

/**
 * 获取数组的最后一个元素类型
 */
type Last<T extends TSTypeUnion[]> = T extends [...unknown[], infer L]
  ? L extends TSTypeUnion
    ? L
    : never
  : never;

type TSArrayToNameArray<T extends TSTypeUnion[]> = T extends [
  infer R,
  ...infer Rest
]
  ? [
      ...(R extends TSTypeUnion ? [TypeToName<R>] : []),
      ...(Rest extends TSTypeUnion[] ? TSArrayToNameArray<Rest> : [])
    ]
  : [];

/**
 * 可重载函数的类型定义
 */
type OverLoadableFunction<T extends TSTypeUnion[][]> = {
  (...args: DropLast<T[number]>): Last<T[number]>;
  [ADD_IMPLEMENT]: <U extends T[number]>(
    ...impl: [
      ...TSArrayToNameArray<DropLast<U>>,
      (...args: DropLast<U>) => Last<U>
    ]
  ) => OverLoadableFunction<T>;
};

type CreateOverloadImpls<T extends TSTypeUnion[][]> = {
  [K in keyof T]: T[K] extends TSTypeUnion[]
    ? [
        ...TSArrayToNameArray<DropLast<T[K]>>,
        (...args: DropLast<T[K]>) => Last<T[K]>
      ]
    : never;
};
// type CreateOverloadImpls<T extends TSTypeUnion[][]> = T extends [
//   infer R,
//   ...infer Rest
// ]
//   ? [
//       ...(R extends TSTypeUnion[]
//         ? [
//             [
//               ...TSArrayToNameArray<DropLast<R>>,
//               (...args: DropLast<R>) => Last<R>
//             ]
//           ]
//         : []),
//       ...(Rest extends TSTypeUnion[][] ? CreateOverloadImpls<Rest> : [])
//     ]
//   : [];

/**
 * 创建一个可重载的函数
 * @template T 类型数组的数组，每个数组最后一个类型为返回值类型
 */
export function createOverload<T extends TSTypeUnion[][]>(
  impls?: CreateOverloadImpls<T>
): OverLoadableFunction<T> {
  const overloadCollection = new Collection<
    <U extends T[number]>(...args: DropLast<U>) => Last<U>
  >((m) => {
    return Reflect.get(m, OVERlOAD_KEY) as string;
  });

  const Method = {
    method<U extends T[number]>(...args: DropLast<U>): Last<U> {
      const overloadKey = args.map((v) => typeof v).join(TYPE_SPLITOR);
      const overload = overloadCollection.get(overloadKey);
      assert(overload, "No implementation found");
      return overload.apply(this, args);
    },

    add<U extends T[number]>(...impl: U) {
      const overload = impl.pop() as unknown as (
        ...args: T[number]
      ) => Last<T[number]>;
      if (typeof overload !== "function") {
        throw Error("The last parameter must be a function");
      }
      const overloadKey = impl.join(TYPE_SPLITOR);
      overloadCollection.addKey(overloadKey, overload, true);
    },
  };

  defineProperty(Method.method, ADD_IMPLEMENT, 0, Method.add);

  if (impls) {
    for (const impl of impls) {
      Method.add(...impl);
    }
  }

  return Method.method as OverLoadableFunction<T>;
}

/**
 * 使用示例
 */
const example = createOverload<
  [[string, number, number], [string, string], [number, number]]
>([
  ["string", "number", (a: string, c: number = 1) => Number(a) + c],
  ["string", (a: string) => a],
  ["number", (a: number) => a],
]);

example("1", 2);
example("1");
example(1);

example[ADD_IMPLEMENT]<[string, number, number]>(
  "string",
  "number",
  (a: string, c: number = 1) => Number(a) + c
);
