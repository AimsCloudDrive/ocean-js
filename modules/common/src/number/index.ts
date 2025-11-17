import { assert } from "../assert";
import { isObject } from "../object";

/**
 * @deprecated
 * @param data
 * @param param1
 * @returns
 */
export function inRange(
  data: number,
  { min, max }: { min?: number; max?: number }
) {
  if (min != undefined && max != undefined) {
    assert(min <= max, "max can't less than min");
    return Math.min(max, Math.max(min, data));
  }
  if (min != undefined) {
    return Math.max(min, data);
  }
  if (max != undefined) {
    return Math.min(max, data);
  }
  return data;
}

const INCLUDE = "include";

type RangeOption = {
  value: number;
  [INCLUDE]?: boolean;
};

const parseRange = (
  range: [(number | RangeOption)?, (number | RangeOption)?]
): [RangeOption, RangeOption] => {
  let [min, max] = range;
  min = typeof min === "number" ? { value: min, include: true } : min;
  max = typeof max === "number" ? { value: max, include: true } : max;
  assert(min && max, () => new TypeError("Invalid Range"));
  return [min, max];
};
export const regressRange = (data: number, range: [number?, number?]) => {
  const [min, max] = range;

  data = typeof min !== "number" || data >= min ? data : min;

  data = typeof max !== "number" || data <= max ? data : max;

  return data;
};

export const isInRangeNumber = (
  data: number,
  range: [(number | RangeOption)?, (number | RangeOption)?]
) => {
  const [min, max] = parseRange(range);
  let IS = true;
  {
    const { include = true, value } = min;
    IS = include ? data >= value : data > value;
  }
  {
    const { include = false, value } = max;
    IS = include ? data <= value : data < value;
  }
  return IS;
};
