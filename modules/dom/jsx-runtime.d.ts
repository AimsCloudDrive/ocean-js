import { ClassType, Event, IEvent, CSSStyle } from "@ocean/common";
import { IRef } from "@ocean/component";

declare global {
  export namespace JSX {
    export interface Element extends React.JSX.Element {}
    // 转换React内置元素属性：驼峰事件 -> 小写事件
    type WithLowercaseEvents<T> = {
      [K in keyof T as K extends `on${infer EventName}`
        ? `on${Lowercase<EventName>}`
        : K]: K extends `on${infer EventName}`
        ? (
            event: Exclude<T[K], undefined> extends React.EventHandler<infer E>
              ? E
              : never
          ) => void
        : T[K];
    };
    // 类组件属性转换器
    export type ComponentPropsConverter<Props, Events extends {} = {}> = Omit<
      Props,
      "children"
    > & {
      [K in keyof Events]?: (
        data: Events[K],
        type: K,
        event: Event<Events>
      ) => void;
    };
    // 处理后的内置元素
    export interface IntrinsicElements {
      [key: string]: any;
    }
    // 具体元素处理
    type _IntrinsicElements = {
      [K in keyof React.JSX.IntrinsicElements]: Omit<
        WithLowercaseEvents<React.JSX.IntrinsicElements[K]>,
        "ref" | "key" | "style"
      > & {
        $ref?: IRef<any> | IRef<any>[];
        $key?: string | number | bigint;
        class?: ClassType;
        style?: CSSStyle;
      };
    };
    export interface IntrinsicElements extends _IntrinsicElements {}
  }
  export interface IComponent<
    Props extends { children?: any } = { children: never },
    Events extends {} = {}
  > extends IEvent<Events> {
    props: JSX.ComponentPropsConverter<Props>;
    $owner?: IComponent;
    el: HTMLElement | Text;
    isMounted(): boolean;
    set(props: Partial<Props>): void;
    setJSX(jsx: Props["children"]): void;
    render(): VNode | undefined | null;
    rendered(): void;
    created(): void;
    mount(): VNode | undefined | null;
    mounted(): void;
    onmounted(handle: () => void): void;
    unmount(): void;
    unmounted(): void;
    onunmounted(handle: () => void): void;
    destroy(): void;
  }

  export type VNodeArray = Iterable<VNode>;
  export type VNode =
    | string
    | number
    | bigint
    | JSX.Element
    | VNodeArray
    | DOMElement;
  export interface HTMLAttributes<T> extends React.AllHTMLAttributes<T> {
    class?: ClassType;
  }

  type H<T = any> = Omit<HTMLAttributes<T>, "style" | "children" | "class"> & {
    $ref?: IRef<any> | IRef<any>[];
    $key?: string | number | bigint;
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
}
