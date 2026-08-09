import { Nullable } from "../global";
export declare function toUpper(text: string): string;
export declare function toLower(text: string): string;
interface TransOption {
    beforReturn?: (transed: string, origin: string) => string | Nullable | void;
}
interface KebabToCamelOption extends TransOption {
    firstLetter?: "toLower" | "toUpper";
}
export declare function kebabToCamel(text: string, option?: KebabToCamelOption): string;
export declare function camelToKebab(text: string, option?: TransOption): string;
export {};
