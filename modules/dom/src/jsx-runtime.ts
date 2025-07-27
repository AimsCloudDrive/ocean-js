import { nil } from "@msom/common";
import { createElement } from "@msom/dom";

function jsxDEV<T extends Msom.JSX.ElementType>(
  type: T,
  config: Msom.H<T>,
  maybeKey?: string | number | bigint | null | undefined,
  isStaticChildren?: boolean,
  source?: object,
  self?: object
): Msom.MsomElement {
  const { children, ..._config } = config;
  _config.$key = nil(_config.$key, maybeKey);
  return createElement(type, _config, ...[nil(children, [])].flat());
}

export { jsxDEV as jsx, jsxDEV as jsxs };
