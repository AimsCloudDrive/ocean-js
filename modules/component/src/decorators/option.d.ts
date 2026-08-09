import { JSTypes } from "@msom/common";
/**
 * 仅允许附着在实例属性或实例访问器属性（有setter）
 * @param type
 * @returns
 */
export declare function option(option?: {
    type?: JSTypes;
}): PropertyDecorator;
