interface MapAssignArrayObjcetItem<T extends Record<string, any>> {
  source?: keyof T | ((data: T) => any) | unknown;
  target: string;
}

type MapAssignArrayMap<T extends Record<string, any>> =
  | Array<string | MapAssignArrayObjcetItem<T>>
  | ReadonlyArray<string | MapAssignArrayObjcetItem<T>>;

interface MapAssignObejctM<T extends Record<string, any>> {
  source?: keyof T | ((data: T) => any) | unknown;
  target: string;
}

type MapAssignObejctMap<T extends Record<string, any>> =
  | MapAssignObejctM<T>
  | Readonly<MapAssignObejctM<T>>;

type MapAssignMap<T extends Record<string, any>> =
  | MapAssignArrayMap<T>
  | MapAssignObejctMap<T>;

type NormalizedMap<T extends Record<string, any>, M extends MapAssignMap<T>> =
  M extends MapAssignArrayMap<T>
    ? {
        [K in keyof M as M[K] extends string
          ? M[K]
          : M[K] extends MapAssignArrayObjcetItem<T>
            ? M[K]["target"]
            : never]: M[K] extends string
          ? (data: T) => T[M[K]]
          : M[K] extends MapAssignArrayObjcetItem<T>
            ? M[K]["source"] extends string
              ? (data: T) => T[M[K]["source"]]
              : M[K]["source"] extends (...args: any) => any
                ? (data: T) => ReturnType<M[K]["source"]>
                : (data: T) => M[K]["source"]
            : never;
      }
    : {
        [K in keyof M]: M[K] extends keyof T
          ? (data: T) => T[M[K]]
          : M[K] extends (...args: any) => any
            ? (data: T) => ReturnType<M[K]>
            : (data: T) => M[K];
      };

type MapAssignResult<
  T extends Record<string, any>,
  M extends MapAssignMap<T>,
> = {
  [K in keyof NormalizedMap<T, M>]: NormalizedMap<T, M>[K] extends (
    ...args: any
  ) => any
    ? ReturnType<NormalizedMap<T, M>[K]>
    : never;
};

export const mapAssign = <
  T extends Record<string, any>,
  M extends MapAssignMap<T>,
>(
  source: T,
  map: M,
): MapAssignResult<T, M> => {
  let normalizedMap: NormalizedMap<T, M>;

  if (Array.isArray(map)) {
    normalizedMap = Object.fromEntries(
      map.map((item, index) => {
        if (typeof item === "string") {
          return [item, (data) => data[item]];
        } else if (
          item &&
          typeof item === "object" &&
          typeof item.target === "string"
        ) {
          const { source: sourceKeyF, target } = item;
          if (typeof sourceKeyF === "string") {
            return [target, (data) => data[sourceKeyF]];
          } else if (typeof sourceKeyF === "function") {
            return [target, sourceKeyF];
          } else {
            return [target, () => sourceKeyF];
          }
        }
        throw new Error(
          `map 数组第 ${
            index + 1
          } 项必须是 string 或 {source: string, target: string | function} 格式`,
        );
      }),
    ) as NormalizedMap<T, M>;
  } else if (map && typeof map === "object" && map !== null) {
    normalizedMap = Object.fromEntries(
      Object.entries(map).map(([target, sourceKeyF]) => [
        target,
        typeof sourceKeyF === "string"
          ? (data) => data[sourceKeyF]
          : typeof sourceKeyF === "function"
            ? sourceKeyF
            : () => sourceKeyF,
      ]),
    ) as NormalizedMap<T, M>;
  } else {
    throw new Error("map 参数必须是对象或数组类型");
  }

  const result = Object.fromEntries(
    Object.entries(normalizedMap).map(([key, fn]) => [key, fn(source)]),
  );
  return result as MapAssignResult<T, M>;
};
