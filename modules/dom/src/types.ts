import { Nullable } from "@msom/common";

export type ClassType =
  | string
  | (string | false | Nullable)[]
  | { [K in string]: boolean };

export type CSSStyle =
  | string
  | {
      [K in keyof CSSStyleDeclaration]?: number | string;
    }
  | [keyof CSSStyleDeclaration, number | string][];

export type VNodeProps = {
  children?: VNodeChildren;
  $key?: string | number;
  $ref?: unknown;
  $context?: unknown;
  class?: ClassType;
  className?: string;
  style?: CSSStyle;
  [key: string]: unknown;
};

export type VNodeChildren = VNode | VNode[] | null;

export interface VNode {
  type: string | ((props: any) => VNode) | ComponentConstructor;
  props: VNodeProps;
}

export type ComponentConstructor = new (props: any) => ComponentInstance;

export interface ComponentInstance {
  props: any;
  render(): VNode | null;
  created?(): void;
  mounted?(): void;
  unmounted?(): void;
}

export type DOMElement = HTMLElement | Text;

export type EventHandler = (event: any) => void;

export type ChangeType = "add" | "update" | "remove";

export interface AttributeChange {
  type: ChangeType;
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface EventChange {
  type: ChangeType;
  eventName: string;
  oldHandler?: EventHandler;
  newHandler?: EventHandler;
}

export interface EventProxy extends Event {
  nativeEvent: Event;
}

export function createEventProxy<E extends Event>(e: E): EventProxy {
  return new Proxy(e, {
    get(target, prop, receiver) {
      if (prop === "nativeEvent") {
        return receiver;
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set: Reflect.set,
  }) as EventProxy;
}
