import { OcPromise } from "@msom/common";
export type Only<T, U> = U extends T ? U : never;
export type StringOrRegExp = string | RegExp;
export declare function toFileUrl(filePath: string): string;
export declare function getModuleName(path: string): string;
export declare function getDemos(basePath: string): {
    [K in string]: () => OcPromise<unknown>;
};
export type DemosObject = {
    [K in string]: DemosObject | (() => OcPromise<unknown>);
};
export declare function getDemosObject(basePath: string): DemosObject;
