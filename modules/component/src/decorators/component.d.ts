import { JSTypes } from "@msom/common";
export type ComponentOption = {
    events?: {
        [K in string]: JSTypes;
    };
};
/**
 * 仅附着在类上
 * @param name
 * @param option
 * @returns
 */
export declare function component(name: Exclude<string, "">, option?: ComponentOption): ClassDecorator;
