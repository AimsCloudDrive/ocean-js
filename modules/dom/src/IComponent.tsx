import { IEvent } from "@msom/common";

declare global {
  export namespace Component {
    interface Context {}
  }
}

export type IComponentProps<C = unknown> = {
  children?: C;
};

export type IComponentEvents = {};

export interface IComponent<
  Props extends IComponentProps<unknown> = IComponentProps<unknown>,
  Events extends IComponentEvents = IComponentEvents
> extends IEvent<Events> {
  props: Msom.JSX.ComponentPropsConverter<Props, Events>;
  $owner?: IComponent;
  get el(): HTMLElement | Text;

  // 状态管理方法 - 只保留这两个
  isMounted(): boolean;
  isDestroyed(): boolean;

  // 基础方法
  set(props: Partial<Props>, force?: boolean): void;
  setJSX(jsx: Props["children"]): void;
  render(): Msom.MsomNode | undefined | null | void;
  rendered(): void;
  setup(): void;
  created(): void;
  mount(): Msom.MsomNode | undefined | null | void;
  mounted(): void;
  onmounted(handle: () => void): void;
  unmount(): void;
  unmounted(): void;
  onunmounted(handle: () => void): void;
  destroy(): void;
}
