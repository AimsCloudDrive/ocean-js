import { isArray } from "../array";
import { Nullable } from "../global";
import { camelToKebab } from "../string";

export type ClassType =
  | string
  | (string | false | Nullable)[]
  | { [K in string]: boolean };

export function parseClass(classType: ClassType): string {
  if (typeof classType === "string") return classType.trim();
  if (isArray(classType)) {
    return classType
      .reduce<string>((className, _classType) => {
        if (typeof _classType === "string" && _classType !== "") {
          return `${className} ${_classType}`;
        }
        return className;
      }, "")
      .trim();
  }
  return Object.entries(classType)
    .reduce<string>(
      (className, [_classType, IS]) =>
        IS ? `${className} ${_classType}` : className,
      ""
    )
    .trim();
}

export type CSSStyle =
  | string
  | {
      [K in keyof CSSStyleDeclaration]?: number | string;
    }
  | [keyof CSSStyleDeclaration, number | string][];

export function parseStyle(style: CSSStyle): string {
  if (typeof style === "string") return style;
  if (isArray(style)) {
    style = style.reduce((a, b) => {
      a[b[0]] = b[1];
      return a;
    }, {});
  }
  return Object.entries(style)
    .map<string>(([n, v]) => {
      n = camelToKebab(n, {
        beforReturn(text) {
          if (text.startsWith("webkit")) {
            return "-" + text;
          }
        },
      });
      if (v == undefined) {
        return "";
      }
      if (typeof v === "number" && !isNumericCSSProperty(n)) {
        v = `${v}px`;
      }
      return `${n}: ${v}`;
    })
    .join("; ")
    .trim();
}
function isNumericCSSProperty(camelCaseProp: string) {
  // 驼峰命名转CSS属性名（短横线命名）
  const cssProperty = camelToKebab(camelCaseProp, {
    beforReturn(text) {
      if (text.startsWith("webkit")) {
        return "-" + text;
      }
    },
  });

  // 定义接受纯数字值的CSS属性集合
  const numericProperties = new Set([
    "z-index", // 层级
    "opacity", // 透明度
    "flex-grow", // 弹性扩展比例
    "flex-shrink", // 弹性收缩比例
    "order", // 弹性项目排序
    "font-weight", // 字体粗细（数值形式）
    "line-height", // 行高（可接受无单位数值）
    "column-count", // 列数
    "counter-increment", // 计数器增量
    "counter-reset", // 计数器重置
    "grid-row-start", // 网格行起始位置
    "grid-row-end", // 网格行结束位置
    "grid-column-start", // 网格列起始位置
    "grid-column-end", // 网格列结束位置
    "orphans", // 分页时保留的底部行数
    "widows", // 分页时保留的顶部行数
    "scale", // 变换比例
    "fill-opacity", // 填充不透明度
    "stroke-opacity", // 描边不透明度
    "stroke-width", // 描边宽度（在某些上下文中可接受无单位值）
    "shape-image-threshold", // 形状图像阈值
  ]);

  // 检查属性是否在纯数字集合中
  return numericProperties.has(cssProperty);
}

// 导出VNode管理工具
export * from "./vnode";
