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
  isArray,
  ownKeysAndPrototypeOwnKeys,
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
      const observer = observers[name];
      // TODO: 普通属性、计算属性、方法属性
      observer.notify();
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

  private declare clean: (() => void)[];
  onclean(cb: () => void) {
    this.clean.push(cb);
  }

  destroy() {
    while (this.clean.length) {
      this.clean.shift()?.();
    }
    Object.assign(this, { el: null });
    this.unmount();
  }
  isMounted() {
    return !!this.el && this.el.parentElement != null;
  }
}

export type ComponentDefinition = {
  componentName: string;
  $preOptions: {
    [K in PropertyKey]: {
      propName: string;
      type: JSTypes | "array";
    };
  };
  $options: {
    [K in PropertyKey]: {
      propName: string;
      type: JSTypes | "array";
    };
  };
  $events: {
    [K in PropertyKey]: JSTypes;
  };
  $observers: {
    [K in PropertyKey]: Observer;
  };
};

/**
 * 初始化组件定义
 * 不会向上继续找原型对象的原型
 * @param prototype 组件类的原型对象
 * @returns 组件定义
 */
export function initComponentDefinition(
  prototype: object
): ComponentDefinition {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  // 原型对象的原型
  const prototype_prototype = Object.getPrototypeOf(prototype);
  //
  const prototype_prototype_definition =
    getComponentDefinition(prototype_prototype);
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
      assert(definition);
      Object.assign(definition, {
        $options: Object.create(
          prototype_prototype_definition?.["$options"] || null
        ),
        $events: Object.create(
          prototype_prototype_definition?.["$events"] || null
        ),
        $observers: Object.create(
          prototype_prototype_definition?.["$observers"] || null
        ),
        $preOptions: Object.create(null),
      });
      // 设置组件定义
      defineProperty(prototype, componentDefinitionKey, 0, definition);
    }
    return definition;
  } finally {
    // 恢复原型
    Object.setPrototypeOf(prototype, prototype_prototype);
  }
}
export function getComponentDefinition(
  prototype: object
): ComponentDefinition | undefined {
  const { componentDefinitionKey } = getGlobalData("@ocean/component") as {
    componentDefinitionKey: symbol;
  };
  const oldProptotype = Object.getPrototypeOf(prototype);
  try {
    // 置空原型
    Object.setPrototypeOf(prototype, null);
    // 获取组件定义
    return Reflect.get(prototype, componentDefinitionKey);
  } finally {
    // 恢复原型
    Object.setPrototypeOf(prototype, oldProptotype);
  }
}
