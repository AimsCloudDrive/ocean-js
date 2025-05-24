import {
  CSSStyle,
  ComponentDefinition,
  Event,
  Nullable,
  ClassType as _ClassType,
  getGlobalData,
  initComponentDefinition,
  isArray,
  ownKeysAndPrototypeOwnKeys,
  parseClass,
} from "@ocean/common";
import { getObserver } from "@ocean/reaction";
import { component, option } from "../Decorator";
import { IRef } from "./Ref";

declare global {
  export namespace Component {
    export interface Context {}
  }
}

interface IComponent<P> {
  props: P;
  context: Partial<Component.Context>;
  setProps(props: P): void;
  forceUpdate(): void;
}

export type ComponentProps<C = never> = {
  $context?: Partial<Component.Context>;
  $key?: string | number;
  $ref?: IRef<unknown>;
  class?: _ClassType;
  style?: CSSStyle;
  children?: C;
};

export type ComponentEvents = {
  created: null;
  mounted: null;
  unmounted: null;
};

@component("component", {
  events: {
    created: "null",
    mounted: "null",
    unmounted: "null",
  },
})
export abstract class Component<
    P extends ComponentProps<unknown> = ComponentProps,
    E extends ComponentEvents = ComponentEvents
  >
  extends Event<E>
  implements IComponent<P>
{
  setState: unknown;
  state: unknown;
  refs: unknown;
  forceUpdate(): void {}
  declare context: Partial<Component.Context>;
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

  declare $owner?: Component<ComponentProps<unknown>, ComponentEvents>;

  // 设置JSX
  setJSX(jsx: P["children"]) {}

  getClassName(): string {
    const p = this.props as ComponentProps<unknown>;
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
    if ($ctx && Object.hasOwnProperty.call($ctx, key)) {
      return $ctx[key];
    }
    return $p?.getContext(key) as Partial<Component.Context>[T];
  }

  private getUpComp() {
    return this.$owner;
  }

  set(props: Partial<P>) {
    this.setProps(props);
  }

  getDefinition(): ComponentDefinition {
    const prototype = Reflect.getPrototypeOf(this);
    if (!prototype) throw Error("the component not prototype");
    return initComponentDefinition(prototype);
  }

  setProps(props: Partial<P>) {
    const definition = this.getDefinition();
    if (!definition) return;
    const options = definition.$options;
    Object.entries(props).forEach(([propName, value]) => {
      const propDef = options[propName];
      if (!propDef) return;
      const { type } = propDef;
      const valueType = isArray(value) ? "array" : typeof value;
      if (type == "unknown" || valueType === type) {
        this[propName] = value;
      } else {
        console.warn(`[Component] ${propName} is not a ${type}`);
      }
    });
  }

  updateProperty(name: PropertyKey): void {
    const definition = this.getDefinition();
    if (!definition) return;
    const observers = definition.$observers;
    const observerKeys = ownKeysAndPrototypeOwnKeys(observers);
    if (observerKeys.hasElement(name)) {
      // TODO: 普通属性、计算属性、方法属性
      const observer = getObserver.call(this, name);
      observer && observer.notify();
    } else {
      if (typeof name === "symbol") {
        console.warn(
          name,
          ` of [Component.${definition.componentName}] is not a Observer Property`
        );
      } else {
        console.warn(
          `The ${name} of [Component.${definition.componentName}] is not a Observer Property`
        );
      }
    }
  }

  render(): any {}
  rendered(): void {}
  init() {
    this.clean = [];
  }

  private declare clean: (() => void)[];
  onclean(cb: () => void) {
    this.clean.push(cb);
  }

  isMounted() {
    return !!this.el && this.el.parentElement != null;
  }
  // lifeCircle
  created() {}
  mount() {
    const DomData = getGlobalData("@ocean/dom") as {
      rendering: Component | undefined;
    };
    const { rendering } = DomData;
    try {
      return this.render();
    } finally {
      DomData.rendering = rendering;
    }
  }
  mounted() {
    this.emit("mounted", null);
  }
  onmounted(cb: () => void) {
    this.on("mounted", cb);
  }
  unmount() {
    if (this.el) {
      const p = this.el.parentElement;
      if (p) {
        p.removeChild(this.el);
        this.unmounted();
      }
      Object.assign(this, { el: null });
    }
  }
  unmounted() {
    this.emit("unmounted", null);
  }
  onunmounted(cb: () => void) {
    this.on("unmounted", cb);
  }
  destroy() {
    while (this.clean.length) {
      this.clean.shift()?.();
    }
    Object.assign(this, { el: null });
    this.unmount();
  }
}
