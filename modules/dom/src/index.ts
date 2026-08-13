export * from "./element";
export * from "./addStyle";
export * from "./Ref";
export * from "./IComponent";
export * from "./render";
export { ErrorBoundary } from "./ErrorBoundary";
export type {
  VNode,
  VNodeProps,
  VNodeChildren,
  DOMElement,
  ClassType,
  CSSStyle,
  ComponentConstructor,
  ComponentInstance,
} from "./types";

// 重新导出VNodeWithDOM类型
export type { VNodeWithDOM } from "@msom/common";
