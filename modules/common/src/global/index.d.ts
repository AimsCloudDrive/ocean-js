import { Collection } from "../collection";
import { IPermission } from "../permission";
export declare function GeneratSymbolKey(key: string): symbol;
export declare function setGlobalData<T>(key: string, data: T): T;
export declare function getGlobalData(key: string): unknown;
export type Nullable = null | undefined;
export type createFunction<T extends unknown[]> = T extends [
    ...infer P,
    infer R
] ? (...args: P) => R : never;
declare const propertyPermission: {
    enumerable: number;
    writable: number;
    configurable: number;
};
export declare const PropertyPermission: {
    new (permission?: number): {
        permission: number;
        readonly permissionState: {
            enumerable: number;
            writable: number;
            configurable: number;
        };
        parsePermissions<Ps extends ("configurable" | "enumerable" | "writable")[]>(permissions: Ps, force?: boolean): Ps;
        has(...permissions: ("configurable" | "enumerable" | "writable")[]): boolean;
        add(...permissions: ("configurable" | "enumerable" | "writable")[]): /*elided*/ any;
        remove(...permissions: ("configurable" | "enumerable" | "writable")[]): /*elided*/ any;
        get<Ps extends ("configurable" | "enumerable" | "writable")[]>(...permissions: Ps): { [k in Ps extends [] ? "configurable" | "enumerable" | "writable" : Ps[number]]: boolean; };
    };
    from(flag: number | IPermission<{
        enumerable: number;
        writable: number;
        configurable: number;
    }>): {
        permission: number;
        readonly permissionState: {
            enumerable: number;
            writable: number;
            configurable: number;
        };
        parsePermissions<Ps extends ("configurable" | "enumerable" | "writable")[]>(permissions: Ps, force?: boolean): Ps;
        has(...permissions: ("configurable" | "enumerable" | "writable")[]): boolean;
        add(...permissions: ("configurable" | "enumerable" | "writable")[]): /*elided*/ any;
        remove(...permissions: ("configurable" | "enumerable" | "writable")[]): /*elided*/ any;
        get<Ps extends ("configurable" | "enumerable" | "writable")[]>(...permissions: Ps): { [k in Ps extends [] ? "configurable" | "enumerable" | "writable" : Ps[number]]: boolean; };
    };
};
/**
 * @param target
 * @param propKey
 * @param permission 7
 * * const enumerable = 0b100;
 * * const writable = 0b010;
 * * const configurable = 0b001;
 * @param value
 */
export declare function defineProperty<T>(target: T, propKey: string | symbol, permission?: IPermission<typeof propertyPermission> | number, value?: unknown): void;
/**
 * @param target
 * @param propKey
 * @param permission [0-5]
 * * const configurable = 0b001;
 * * const enumerable = 0b100;
 * * 访问器属性修饰符无法设置writable
 * @param getter
 * @param setter
 */
export declare function defineAccesser<T, R>(target: T, propKey: symbol | string, permission?: IPermission<typeof propertyPermission> | number, getter?: () => R, setter?: (value: R) => void): void;
export declare function tryCall<F extends createFunction<[...unknown[], unknown]>>(call: F, data?: Parameters<F>, receiver?: unknown): ReturnType<F>;
export declare function equal(value: unknown, otherValue: unknown): boolean;
export declare function ownKeysAndPrototypeOwnKeys($events: object, keys?: Collection<PropertyKey>): Collection<PropertyKey>;
export {};
