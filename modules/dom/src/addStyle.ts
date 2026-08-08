import { CSSStyle, parseStyle } from "@msom/common";

/**
 * 将 CSS 样式添加到文档中
 * @param cssType CSS 样式字符串或对象
 */
export function addStyle(cssType: CSSStyle): void {
  const cssText =
    typeof cssType === "string" ? cssType : parseStyle(cssType);
  const styleEl = document.createElement("style");
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);
}
