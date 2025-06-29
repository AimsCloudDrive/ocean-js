import { nil } from "../assert";
import { Nullable } from "../global";

export function toUpper(text: string) {
  return text
    .split("")
    .map((v, i) => (i === 0 ? v.toUpperCase() : v))
    .join("");
}
export function toLower(text: string) {
  return text
    .split("")
    .map((v, i) => (i === 0 ? v.toLowerCase() : v))
    .join("");
}
const trans: Record<
  Required<KebabToCamelOption>["firstLetter"],
  (text: string) => string
> = { toLower, toUpper };

interface TransOption {
  beforReturn?: (transed: string, origin: string) => string | Nullable | void;
}

interface KebabToCamelOption extends TransOption {
  firstLetter?: "toLower" | "toUpper";
}
export function kebabToCamel(
  text: string,
  option: KebabToCamelOption = {}
): string {
  const _option: Required<KebabToCamelOption> = {
    firstLetter: "toLower",
    beforReturn: (text) => text,
    ...option,
  };
  if (
    !Object.getOwnPropertyNames(trans).some((v) => v === _option.firstLetter)
  ) {
    throw new TypeError(
      "the option of firstLetter must be 'toLower' or 'toUpper'."
    );
  }
  const result = text
    .split("-")
    .map((v, i) => (i === 0 ? trans[_option.firstLetter] : toUpper)(v))
    .join("");
  return nil(_option.beforReturn(result, text), result);
}
export function camelToKebab(text: string, option: TransOption = {}) {
  const _option: Required<TransOption> = {
    beforReturn: (text) => text,
    ...option,
  };
  // 处理连续大写字母的情况
  const result = text
    .replace(/([A-Z]+)([A-Z][a-z]?)/g, "$1-$2") // 处理连续大写字母后跟"大写+小写"的情况
    .replace(/([a-z])([A-Z])/g, "$1-$2") // 处理小写后跟大写的情况
    .replace(/([A-Z])([A-Z]+)/g, "$1-$2") // 处理单个大写字母后跟连续大写的情况
    .toLowerCase();
  return nil(_option.beforReturn(result, text), result);
}
