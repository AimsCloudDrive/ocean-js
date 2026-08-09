interface MapAssignArrayObjcetItem<T extends Record<string, any>> {
    source?: keyof T | ((data: T) => any) | unknown;
    target: string;
}
type MapAssignArrayMap<T extends Record<string, any>> = Array<string | MapAssignArrayObjcetItem<T>> | ReadonlyArray<string | MapAssignArrayObjcetItem<T>>;
interface MapAssignObejctM<T extends Record<string, any>> {
    source?: keyof T | ((data: T) => any) | unknown;
    target: string;
}
type MapAssignObejctMap<T extends Record<string, any>> = MapAssignObejctM<T> | Readonly<MapAssignObejctM<T>>;
type MapAssignMap<T extends Record<string, any>> = MapAssignArrayMap<T> | MapAssignObejctMap<T>;
type NormalizedMap<T extends Record<string, any>, M extends MapAssignMap<T>> = M extends MapAssignArrayMap<T> ? {
    [K in keyof M as M[K] extends string ? M[K] : M[K] extends MapAssignArrayObjcetItem<T> ? M[K]["target"] : never]: M[K] extends string ? (data: T) => T[M[K]] : M[K] extends MapAssignArrayObjcetItem<T> ? M[K]["source"] extends string ? (data: T) => T[M[K]["source"]] : M[K]["source"] extends (...args: any) => any ? (data: T) => ReturnType<M[K]["source"]> : (data: T) => M[K]["source"] : never;
} : {
    [K in keyof M]: M[K] extends keyof T ? (data: T) => T[M[K]] : M[K] extends (...args: any) => any ? (data: T) => ReturnType<M[K]> : (data: T) => M[K];
};
type MapAssignResult<T extends Record<string, any>, M extends MapAssignMap<T>> = {
    [K in keyof NormalizedMap<T, M>]: NormalizedMap<T, M>[K] extends (...args: any) => any ? ReturnType<NormalizedMap<T, M>[K]> : never;
};
export declare const mapAssign: <T extends Record<string, any>, M extends MapAssignMap<T>>(source: T, map: M) => MapAssignResult<T, M>;
export {};
