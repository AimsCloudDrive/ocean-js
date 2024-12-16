import {
  COMPONENT_OPTION_KEY,
  ClassType as _ClassType,
  Event,
  Nullable,
  getGlobalData,
  parseClass,
  setGlobalData,
  CSSStyle,
} from "@ocean/common";
import { component, option } from "../Decorator";
import { IRef } from "./Ref";
import { Observer } from "@ocean/reaction";

declare global {
  export namespace Component {
    export interface Context {}
  }
}

declare global {
  export namespace Ocean {
    export interface Store {
      "@ocean/component": {
        componentKeyWord: symbol;
        componentEventsKey: symbol;
        instanceEventBindingKey: symbol;
        componentKeyMap: Map<string, any>;
        rendering?: Component;
      };
    }
  }
}
setGlobalData("@ocean/component", {
  componentKeyWord: Symbol("component"),
  componentKeyMap: new Map(),
  componentEventsKey: Symbol("component_events"),
  instanceEventBindingKey: Symbol("instance_event_binding"),
});

interface IComponent<P, E, C> {
  props: P;
  context: Partial<Component.Context>;
  setProps(props: P): void;
  forceUpdate(): void;
}

export type ComponentProps<C = never> = {
  $context?: Partial<Component.Context>;
  $key?: string | number;
  $ref?: IRef<any>;
  class?: _ClassType;
  style?: CSSStyle;
  children?: C;
};

export type ComponentEvents = {
  mounted: null;
  unmounted: null;
};

@component("component", {
  events: {
    mounted: "null",
    unmounted: "null",
  },
})
export class Component<
    P extends ComponentProps<any> = ComponentProps,
    E extends ComponentEvents = ComponentEvents
  >
  extends Event<E>
  implements IComponent<P, E, P["children"]>
{
  setState: any;
  state: any;
  refs: any;
  forceUpdate(): void {}
  declare context: any;

  @option()
  private $key: string | number | Nullable;
  @option()
  private $context?: Partial<Component.Context>;
  declare props: P;
  declare el: HTMLElement;
  constructor(props: P) {
    super();
    this.init();
    this.props = props;
    this.set(props);
  }

  declare $owner?: Component<any, any>;
  declare $parent?: Component<any, any>;

  setJSX(jsx: P["children"]) {}

  getClassName(): string {
    const p = this.props as any;
    return p.class ? parseClass(p.class) : "";
  }
  getStyle(): string {
    return "";
  }

  getContext<T extends keyof Partial<Component.Context>>(
    key: T
  ): Partial<Component.Context>[T] {
    const $ctx = this.$context;
    const $p = this.getUpComp();
    if ($ctx && $ctx.hasOwnProperty(key)) {
      return $ctx[key];
    }
    return $p?.getContext(key) as Partial<Component.Context>[T];
  }

  private getUpComp() {
    return this.$owner || this.$parent;
  }

  set(props: Partial<P>) {
    this.setProps(props);
  }

  setProps(props: Partial<P>) {
    const options = this.getOptions();
    Object.entries(props).forEach(([k, v]: [any, any]) => {
      if (Object.hasOwnProperty.call(options, k)) {
        this[k as keyof typeof this] = v;
      }
    });
  }
  private getOptions() {
    const OPTIONS = Reflect.get(this, COMPONENT_OPTION_KEY) || {};
    return OPTIONS as { [K in keyof P]: any };
  }
  private getObservers(): Record<string, Observer> {
    const { observerListKey } = getGlobalData("@ocean/reaction");
    return Reflect.get(this, observerListKey) || {};
  }
  updateProperty(name: string): void {
    const observers = this.getObservers();
    if (observers.hasOwnProperty(name)) {
      const ob = observers[name];
      // TODO: 普通属性、计算属性、方法属性
      ob.update();
    } else {
      console.warn(`[Component] ${name} is not a observer`);
    }
  }
  render(): any {}
  rendered(): void {}
  init() {
    this.mountedEvents = [];
    this.unmountedEvents = [];
    this.clean = [];
  }
  private declare mountedEvents: (() => void)[];
  private declare unmountedEvents: (() => void)[];
  mounted() {
    this.emit("mounted", null);
    while (this.mountedEvents.length) {
      this.mountedEvents.shift()?.();
    }
  }
  onmounted(cb: () => void) {
    this.mountedEvents.push(cb);
  }

  unmount() {
    if (this.el) {
      const p = this.el.parentElement;
      if (p) {
        p.removeChild(this.el);
        this.unmounted();
      }
    }
  }
  unmounted() {
    this.emit("unmounted", null);
    while (this.unmountedEvents.length) {
      this.unmountedEvents.shift()?.();
    }
  }
  onunmounted(cb: () => void) {
    this.unmountedEvents.push(cb);
  }

  private declare clean: (() => void)[];
  onclean(cb: () => void) {
    this.clean.push(cb);
  }

  destroy() {
    while (this.clean.length) {
      this.clean.shift()?.();
    }
    Object.assign(this, { el: undefined });
    this.unmount();
  }
  isMounted() {
    return !!this.el && this.el.parentElement != null;
  }
}

export function isComponent(ctor: Function) {
  const { componentKeyWord: componentKey, componentKeyMap: componentMap } =
    getGlobalData("@ocean/component");
  const name = ctor.prototype[componentKey];
  if (name == undefined) {
    return false;
  }
  if (!!componentMap.get(name)) {
    return true;
  }
  return false;
}
