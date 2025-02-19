import {
  ClassType as _ClassType,
  Event,
  Nullable,
  getGlobalData,
  parseClass,
  setGlobalData,
  CSSStyle,
  defineProperty,
  JSTypes,
  assert,
} from "@ocean/common";
import { component, option } from "../Decorator";
import { IRef } from "./Ref";
import { Observer } from "@ocean/reaction";

declare global {
  export namespace Component {
    export interface Context {}
  }
}

setGlobalData("@ocean/component", {
  instanceEventBindingKey: Symbol("instance_event_binding"),
  componentDefinitionKey: Symbol("component_definition"),
  componentMap: new Map(),
});

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
  declare $parent?: Component<ComponentProps<unknown>, ComponentEvents>;

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
    return this.$owner || this.$parent;
  }

  set(props: Partial<P>) {
    this.setProps(props);
  }

  getDefinition(): ComponentDefinition {
    return getOrInitComponentDefinition(this);
  }

  setProps(props: Partial<P>) {
    const definition = this.getDefinition();
    if (!definition) return;
    const options = definition.$options;
    Object.entries(options).forEach(([propKey, prop]) => {
      if (Object.hasOwnProperty.call(props, prop.propName)) {
        const value = props[prop.propName];
        if (prop.type === "array" && Array.isArray(value)) {
          this[propKey] = value;
        } else if (typeof value === prop.type) {
          this[propKey] = value;
        } else {
          console.warn(`[Component] ${propKey} is not a ${prop.type}`);
        }
      }
    });
  }

  updateProperty(name: string): void {
    const definition = this.getDefinition();
    if (!definition) return;
    const observers = definition.$observers;
    if (Object.hasOwnProperty.call(observers, name)) {
      const observer = observers[name];
      // TODO: 普通属性、计算属性、方法属性
      observer.update();
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

export type ComponentDefinition = {
  componentName: string;
  $options: {
    [K in string]: {
      propName: string;
      type: JSTypes | "array";
    };
  };
  $events: {
    [K in string]: JSTypes;
  };
  $observers: {
    [K in string]: Observer;
  };
};

/**
 * 初始化组件定义
 * 不会向上继续找原型对象的原型
 * @param prototype 组件类的原型对象
 * @returns 组件定义
 */
export function getOrInitComponentDefinition(
  prototype: object
): ComponentDefinition {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  const oldProptotype = Object.getPrototypeOf(prototype);
  try {
    // 置空原型
    Object.setPrototypeOf(prototype, null);
    // 获取组件定义
    let definition: ComponentDefinition | undefined = Reflect.get(
      prototype,
      componentDefinitionKey
    );
    // 如果组件定义不存在，则初始化组件定义
    if (!definition) {
      definition = Object.create(null);
      Object.assign(definition as ComponentDefinition, {
        $options: {},
        $events: {},
        $observers: {},
      });
      // 设置组件定义
      defineProperty(prototype, componentDefinitionKey, 0, definition);
    }
    // 断言组件定义存在
    assert(definition, `[Component] ${prototype} is not a component`);
    return definition;
  } finally {
    // 恢复原型
    Object.setPrototypeOf(prototype, oldProptotype);
  }
}
