export type FuncAble<T, P extends unknown[] = []> = T | ((...args: P) => T);
