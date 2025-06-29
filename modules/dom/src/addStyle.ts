import { CSSStyle, parseStyle } from "@msom/common";

export function addStyle(cssType: CSSStyle): void {
  new CSSStyleSheet({
    baseURL: URL.createObjectURL(
      new Blob([typeof cssType === "string" ? cssType : parseStyle(cssType)], {
        type: "text/plain",
      })
    ),
  });
}
