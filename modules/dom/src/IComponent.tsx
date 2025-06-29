import { IEvent } from "@msom/common";

declare global {
  export namespace IComponent {
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
  el: HTMLElement | Text;
  isMounted(): boolean;
  set(props: Partial<Props>): void;
  setJSX(jsx: Props["children"]): void;
  render(): Msom.MsomNode | undefined | null | void;
  rendered(): void;
  created(): void;
  mount(): Msom.MsomNode | undefined | null | void;
  mounted(): void;
  onmounted(handle: () => void): void;
  unmount(): void;
  unmounted(): void;
  onunmounted(handle: () => void): void;
  destroy(): void;
}
