export interface IRef<T> {
    set(el: T): void;
    clear(): void;
}
export declare class Ref<T> implements IRef<T> {
    data: T[];
    set(el: T): void;
    get(index: number): T;
    clear(): void;
}
export declare function createRef<T>(): Ref<T>;
export declare class MapRef<T> implements IRef<T> {
    data: Map<any, T>;
    set(el: T): void;
    get(key: string | number): T | undefined;
    clear(): void;
}
export declare function createMapRef<T>(): MapRef<T>;
export declare class SingleRef<T> implements IRef<T> {
    data: T;
    current: T;
    set(el: T): void;
    clear(): void;
}
export declare function createSingleRef<T>(): SingleRef<T>;
