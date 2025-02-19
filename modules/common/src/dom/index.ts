import { isArray } from "../array";
import { Nullable } from "../global";

export type ClassType =
  | string
  | (string | false | Nullable)[]
  | { [K in string]: boolean };

export function parseClass(classType: ClassType): string {
  if (typeof classType === "string") return classType.trim();
  if (isArray(classType)) {
    return classType
      .reduce<string>((c, b) => {
        if (typeof b === "string") {
          return `${c} ${b}`;
        }
        return c;
      }, "")
      .trim();
  }
  return Object.entries(classType)
    .reduce<string>((c, [C, IS]) => (IS ? `${c} ${C}` : c), "")
    .trim();
}

export type CSSStyle =
  | string
  | {
      [K in keyof CSSStyleDeclaration]?: number | string;
    };

export function parseStyle(style: CSSStyle): string {
  if (typeof style === "string") return style;
  return Object.entries(style)
    .map<string>(([n, v]) => {
      if (v == undefined) {
        return "";
      }
      if (typeof v === "number") {
        v = `${v}px`;
      }
      return `${n}: ${v}`;
    })
    .join("; ")
    .trim();
}
