/**
 * @deprecated
 * @param data
 * @param param1
 * @returns
 */
export declare function inRange(data: number, { min, max }: {
    min?: number;
    max?: number;
}): number;
declare const INCLUDE = "include";
type RangeOption = {
    value: number;
    [INCLUDE]?: boolean;
};
export declare const regressRange: (data: number, range: [number?, number?]) => number;
export declare const isInRangeNumber: (data: number, range: [(number | RangeOption)?, (number | RangeOption)?]) => boolean;
export {};
