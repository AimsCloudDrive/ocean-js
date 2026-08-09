import { Nullable } from "../global";
export type ClassType = string | (string | false | Nullable)[] | {
    [K in string]: boolean;
};
export declare function parseClass(classType: ClassType): string;
export type CSSStyle = string | {
    [K in keyof CSSStyleDeclaration]?: number | string;
} | [keyof CSSStyleDeclaration, number | string][];
export declare function parseStyle(style: CSSStyle): string;
export * from "./vnode";
