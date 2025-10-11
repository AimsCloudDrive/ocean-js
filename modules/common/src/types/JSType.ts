export type JSTypeMap = {
  number: number;
  string: string;
  boolean: boolean;
  bigint: bigint;
  function: (...args: unknown[]) => unknown;
  undefined: undefined;
  symbol: symbol;
  object: object;
  null: null;
  unknown: unknown;
};

export type JSTypes = keyof JSTypeMap;

export type ArgsType<T extends JSTypes[]> = [
  ...{
    [I in keyof T]: JSTypeMap[T[I]];
  }
];

type VecHelper<T extends number, K = number, Acc extends K[] = []> = Acc['length'] extends T
  ? Acc
  : VecHelper<T, K, [...Acc, K]>;

export type Vec<T extends number, K = number> = T extends 0 ? K[] : VecHelper<T, K>;