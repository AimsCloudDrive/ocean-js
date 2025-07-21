export function addStyle(cssStyle: string) {
  const style = document.createElement("style");
  style.innerHTML = cssStyle;
  document.head.appendChild(style);
}
