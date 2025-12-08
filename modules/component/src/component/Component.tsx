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
  defineProperty,
} from "@msom/common";
import { getObserver } from "@msom/reaction";
import { component, option } from "../decorators";
import { IRef, IComponent, IComponentProps, IComponentEvents } from "@msom/dom";
import {
  ComponentStateManager,
  STATE_MANAGER_SYMBOL,
  SnapshotManager,
  SNAPSHOT_MANAGER_SYMBOL,
  ComponentSnapshot,
} from "./ComponentStateManager";
import {
  getComponentVNode,
  setComponentVNode,
  VNodeWithDOM,
} from "@msom/common";

/**
 * 组件状态枚举
 */
export enum ComponentState {
  CREATED = "created",
  SETUP = "setup",
  RENDERING = "rendering",
  RENDERED = "rendered",
  MOUNTED = "mounted",
  UNMOUNTED = "unmounted",
  DESTROYED = "destroyed",
}

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
  setup: null;
  mounted: null;
  unmounted: null;
};

@component("component", {
  events: {
    created: "null",
    setup: "null",
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
  get el(): HTMLElement | Text {
    return getComponentVNode(this)?._dom as HTMLElement | Text;
  }

  // 状态管理器
  private [STATE_MANAGER_SYMBOL] = new ComponentStateManager();

  // 快照管理器
  private [SNAPSHOT_MANAGER_SYMBOL] = new SnapshotManager();

  setup() {
    this[STATE_MANAGER_SYMBOL].setState(ComponentState.SETUP);
    this.emit("setup", null);
  }

  /**
   * 构造函数，用于初始化组件实例
   * @param props 组件属性，通过 Msom.JSX.ComponentPropsConverter<P> 进行类型转换
   */
  constructor(props: Msom.JSX.ComponentPropsConverter<P>) {
    super(); // 调用父类构造函数进行初始化
    this.init(); // 调用初始化方法

    // 创建初始快照
    this.createSnapshot("Initial component state");

    this.set(props); // 应用传入的属性
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

  /**
   * 检查组件是否已挂载
   */
  isMounted(): boolean {
    return this[STATE_MANAGER_SYMBOL].isState(ComponentState.MOUNTED);
  }

  /**
   * 检查组件是否已销毁
   */
  isDestroyed(): boolean {
    return this[STATE_MANAGER_SYMBOL].isState(ComponentState.DESTROYED);
  }

  /**
   * 创建快照
   * @param description 快照描述
   * @returns 快照ID
   */
  private createSnapshot(description?: string): number {
    const snapshotData: Record<string, any> = {};

    // 保存当前类的所有可枚举属性
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        try {
          // 过滤掉符号属性和函数
          const value = this[key];
          if (typeof value !== "function" && typeof key === "string") {
            snapshotData[key] = JSON.parse(JSON.stringify(value)); // 深拷贝
          }
        } catch (error) {
          // 如果无法序列化，跳过该属性
          console.warn(`[Component] Cannot serialize property ${key}:`, error);
        }
      }
    }

    // 额外保存一些重要的状态信息
    snapshotData._componentState = this[STATE_MANAGER_SYMBOL].getState();
    snapshotData._vnode = getComponentVNode(this);
    snapshotData._timestamp = Date.now();

    return this[SNAPSHOT_MANAGER_SYMBOL].createSnapshot(
      snapshotData,
      description
    );
  }

  /**
   * 恢复到快照
   * @param snapshotId 快照ID（可选，默认使用最新快照）
   * @returns 是否恢复成功
   */
  private restoreSnapshot(snapshotId?: number): boolean {
    let snapshot: ComponentSnapshot | null;

    if (snapshotId !== undefined) {
      snapshot = this[SNAPSHOT_MANAGER_SYMBOL].getSnapshot(snapshotId);
    } else {
      snapshot = this[SNAPSHOT_MANAGER_SYMBOL].getLatestSnapshot();
    }

    if (!snapshot) {
      console.warn("[Component] No snapshot found to restore");
      return false;
    }

    try {
      const data = snapshot.data;

      // 恢复所有可枚举属性
      for (const key in data) {
        if (
          data.hasOwnProperty(key) &&
          key !== "_componentState" &&
          key !== "_vnode" &&
          key !== "_timestamp"
        ) {
          try {
            // 恢复属性值
            (this as any)[key] = data[key];
          } catch (error) {
            console.warn(`[Component] Cannot restore property ${key}:`, error);
          }
        }
      }

      // 恢复组件状态
      if (data._componentState) {
        this[STATE_MANAGER_SYMBOL].setState(data._componentState);
      }

      // 恢复VNode
      if (data._vnode) {
        setComponentVNode(this, data._vnode);
      }

      console.log(
        `[Component] Successfully restored to snapshot ${snapshot.id} (${
          snapshot.description || "no description"
        })`
      );
      return true;
    } catch (error) {
      console.error("[Component] Failed to restore snapshot:", error);
      return false;
    }
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

  set(props: Partial<P>, force?: boolean) {
    if (force) {
      // 恢复到初始快照
      this.restoreSnapshot(1); // 第一个快照通常是初始状态
    }
    this.setProps(props);
  }

  getDefinition(): ComponentDefinition {
    const prototype = Reflect.getPrototypeOf(this);
    if (!prototype) throw Error("the component not prototype");
    return initComponentDefinition(prototype);
  }

  setProps(props: Partial<P>) {
    const definition = this.getDefinition();
    const _props = this.props || {};
    this.props = _props;
    if (!definition) return;
    const options = definition.$options;
    Object.entries(props).forEach(([propName, value]) => {
      const propDef = options[propName];
      if (!propDef) return;
      const { type } = propDef;
      const valueType = isArray(value) ? "array" : typeof value;
      if (type == "unknown" || valueType === type) {
        this[propName] = value;
        Object.assign(_props, { [propName]: value });
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
  rendered(): void {
    this[STATE_MANAGER_SYMBOL].setState(ComponentState.RENDERED);
  }
  init() {
    this.clean = [];
  }

  private declare clean: (() => void)[];
  onclean(cb: () => void) {
    this.clean.push(cb);
  }

  // lifeCircle
  created() {
    this[STATE_MANAGER_SYMBOL].setState(ComponentState.CREATED);
    this.emit("created", null);
  }

  mount() {
    // 如果组件已销毁，不允许挂载
    if (this.isDestroyed()) {
      console.warn("Cannot mount destroyed component");
      return null;
    }

    const DomData = getGlobalData("@msom/dom") as {
      rendering: ClassComponent | undefined;
    };
    const { rendering } = DomData;
    DomData.rendering = this;
    try {
      this[STATE_MANAGER_SYMBOL].setState(ComponentState.RENDERING);
      const vDOM = this.render();
      return vDOM;
    } finally {
      DomData.rendering = rendering;
    }
  }

  mounted() {
    this[STATE_MANAGER_SYMBOL].setState(ComponentState.MOUNTED);
    this.emit("mounted", null);
  }

  onmounted(cb: () => void) {
    this[STATE_MANAGER_SYMBOL].onStateChange(ComponentState.MOUNTED, cb);
    this.on("mounted", cb);
  }

  unmount() {
    if (this.isDestroyed()) {
      return;
    }

    if (this.el) {
      const p = this.el.parentElement;
      if (p) {
        p.removeChild(this.el);
        this.unmounted();
      }
      this.el.remove();
      Object.assign(this, { el: null });
    }
  }

  unmounted() {
    this[STATE_MANAGER_SYMBOL].setState(ComponentState.UNMOUNTED);
    this.emit("unmounted", null);
  }

  onunmounted(cb: () => void) {
    this.on("unmounted", cb);
  }

  destroy() {
    if (this.isDestroyed()) {
      return;
    }

    this[STATE_MANAGER_SYMBOL].setState(ComponentState.DESTROYED);

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
