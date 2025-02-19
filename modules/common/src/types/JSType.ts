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
