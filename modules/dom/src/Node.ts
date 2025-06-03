import React from "react";
import { CSSStyle, ClassType, ClassType as _C } from "@ocean/common";
import { IRef } from "@ocean/component";
export type VNodeArray = Iterable<VNode>;
export type VNode = string | number | VNodeArray | DOMElement;
export interface HTMLAttributes<T> extends React.AllHTMLAttributes<T> {
  class?: _C;
}

type H<T = any> = Omit<HTMLAttributes<T>, "style" | "children" | "class"> & {
  $ref?: IRef<any> | IRef<any>[];
  $key?: string | number;
  style?: CSSStyle;
  class?: ClassType;
  nodeValue?: string;
  context?: Partial<Component.Context>;
} & {
  children: DOMElement<any>[];
};

export type DOMElement<T = unknown, P extends H = H> = {
  type: T;
  props: P;
};

declare global {
  namespace JSX {
    interface Element extends React.JSX.Element {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
