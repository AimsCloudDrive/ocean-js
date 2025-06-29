import {
  CSSStyle,
  ClassType,
  ComponentDefinition,
  Event,
  IEvent,
  Nullable,
  ClassType as _ClassType,
  getGlobalData,
  initComponentDefinition,
  isArray,
  ownKeysAndPrototypeOwnKeys,
  parseClass,
} from "@msom/common";
import { getObserver } from "@msom/reaction";
import { component, option } from "../decorators";
import { IRef, IComponent, IComponentProps, IComponentEvents } from "@msom/dom";

export type ComponentProps<C = never> = IComponentProps<C> & {
  $context?: Partial<Component.Context>;
  $key?: string | number | bigint | null | undefined;
  $ref?: IRef<unknown> | IRef<unknown>[];
  class?: ClassType;
  style?: CSSStyle;
  children?: C;
};

export type ComponentEvents = IComponentEvents & {
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
class ClassComponent<
    P extends ComponentProps<unknown> = ComponentProps<unknown>,
    E extends ComponentEvents = ComponentEvents
  >
  extends Event<E>
  implements IComponent<P, E>
{
  @option()
  private $key: string | number | Nullable;
  @option()
  private $context?: Partial<Component.Context>;
  declare props: Msom.JSX.ComponentPropsConverter<P, E>;
  declare el: HTMLElement | Text;
  constructor(props: Msom.JSX.ComponentPropsConverter<P>) {
    super();
    this.init();
    this.props = props;
    this.set(props);
  }

  declare $owner?: ClassComponent<ComponentProps, ComponentEvents>;

  // 设置JSX
  setJSX(jsx: P["children"]) {}

  getClassName(): string {
    const p = this.props;
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
      const observer = getObserver.call(this, name);
      observer && observer.notify();
    } else {
      console.warn(
        `The ${String(name)} of [Component.${
          definition.componentName
        }] is not a Observerable Property`
      );
    }
  }
  render(): Msom.MsomNode | Nullable | void {}
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
  created() {
    this.emit("created", null);
  }
  mount() {
    const DomData = getGlobalData("@msom/dom") as {
      rendering: ClassComponent | undefined;
    };
    const { rendering } = DomData;
    try {
      const vDOM = this.render();
      return vDOM;
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
      this.el.remove();
      Object.assign(this, { el: null });
    }
    this;
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
    this.unmount();
  }
}

interface ComponentConstructor {
  new <
    P extends ComponentProps<unknown> = ComponentProps<unknown>,
    E extends ComponentEvents = ComponentEvents
  >(
    props: Msom.JSX.ComponentPropsConverter<P>
  ): ClassComponent<P, E>;

  readonly prototype: ClassComponent;
}

// export const Component: ComponentConstructor = ClassComponent;
export { ClassComponent as Component };
