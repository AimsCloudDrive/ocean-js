import {
  Event,
  Nullable,
  compareObjects,
  getComponentDefinition,
  getGlobalData,
  isArray,
  isComponent,
  isObject,
  isPromiseLike,
  ownKeysAndPrototypeOwnKeys,
  parseClass,
  parseStyle,
  setGlobalData,
} from "@msom/common";
import { createReaction, withoutTrack } from "@msom/reaction";
import { IComponent, IComponentProps } from "./IComponent";
import { IRef } from "./Ref";
import { ComponentState, setComponentState } from "@msom/component";
import {
  getComponentVNode,
  setComponentVNode,
  VNodeWithDOM,
} from "@msom/common";

type $DOM = {
  rendering?: IComponent;
};

setGlobalData("@msom/dom", {} as $DOM);

const componentVDOMMap = new WeakMap<IComponent, Msom.MsomNode | Nullable>();

export const TEXT_NODE = "TEXT_NODE";

// VNodeWithDOM接口现在从@msom/common导入

/**
 * 属性变更类型
 */
export interface AttributeChange {
  type: "add" | "update" | "remove";
  key: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * 事件变更类型
 */
export interface EventChange {
  type: "add" | "update" | "remove";
  eventName: string;
  oldHandler?: EventListener;
  newHandler?: EventListener;
}

/**
 * 比较两个对象的属性差异
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 * @param excludeKeys 要排除的键名数组
 * @returns 属性变更数组
 */
export function compareAttributes(
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
  excludeKeys: string[] = [
    "children",
    "$key",
    "$ref",
    "$context",
    "_dom",
    "_events",
  ],
): AttributeChange[] {
  const changes: AttributeChange[] = [];
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allKeys) {
    // 跳过排除的键名
    if (excludeKeys.includes(key)) continue;

    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // 如果旧属性存在，新属性不存在，则为删除
    if (oldValue !== undefined && newValue === undefined) {
      changes.push({
        type: "remove",
        key,
        oldValue,
      });
    }
    // 如果旧属性不存在，新属性存在，则为新增
    else if (oldValue === undefined && newValue !== undefined) {
      changes.push({
        type: "add",
        key,
        newValue,
      });
    }
    // 如果两个属性都存在但值不同，则为更新
    else if (oldValue !== newValue) {
      changes.push({
        type: "update",
        key,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

/**
 * 比较两个对象的事件差异
 * @param oldProps 旧属性对象
 * @param newProps 新属性对象
 * @returns 事件变更数组
 */
export function compareEvents(
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
): EventChange[] {
  const changes: EventChange[] = [];
  const oldEventKeys = Object.keys(oldProps).filter((key) =>
    key.startsWith("on"),
  );
  const newEventKeys = Object.keys(newProps).filter((key) =>
    key.startsWith("on"),
  );
  const allEventKeys = new Set([...oldEventKeys, ...newEventKeys]);

  for (const eventKey of allEventKeys) {
    const oldHandler = oldProps[eventKey];
    const newHandler = newProps[eventKey];
    const eventName = eventKey.slice(2).toLowerCase();

    // 如果旧事件存在，新事件不存在，则为删除
    if (oldHandler !== undefined && newHandler === undefined) {
      changes.push({
        type: "remove",
        eventName,
        oldHandler,
      });
    }
    // 如果旧事件不存在，新事件存在，则为新增
    else if (oldHandler === undefined && newHandler !== undefined) {
      changes.push({
        type: "add",
        eventName,
        newHandler,
      });
    }
    // 如果两个事件都存在但处理器不同，则为更新
    else if (oldHandler !== newHandler) {
      changes.push({
        type: "update",
        eventName,
        oldHandler,
        newHandler,
      });
    }
  }

  return changes;
}

/**
 * 应用属性变更到DOM元素
 * @param dom DOM元素
 * @param changes 属性变更数组
 */
export function applyAttributeChanges(
  dom: HTMLElement | Text,
  changes: AttributeChange[],
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "update":
        if (change.key === "className" && dom instanceof HTMLElement) {
          dom.className = change.newValue;
        } else if (
          change.key === "style" &&
          typeof change.newValue === "object" &&
          dom instanceof HTMLElement
        ) {
          Object.assign(dom.style, change.newValue);
        } else if (
          change.key === "nodeValue" &&
          dom.nodeType === Node.TEXT_NODE
        ) {
          dom.textContent = change.newValue;
        } else if (dom instanceof HTMLElement) {
          dom.setAttribute(change.key, change.newValue);
        }
        break;
      case "remove":
        if (change.key === "className" && dom instanceof HTMLElement) {
          dom.className = "";
        } else if (change.key === "style" && dom instanceof HTMLElement) {
          dom.removeAttribute("style");
        } else if (dom instanceof HTMLElement) {
          dom.removeAttribute(change.key);
        }
        break;
    }
  }
}

/**
 * 应用事件变更到DOM元素
 * @param dom DOM元素
 * @param changes 事件变更数组
 * @param eventMap 事件映射表（用于存储事件处理器）
 */
export function applyEventChanges(
  dom: HTMLElement | Text,
  changes: EventChange[],
  eventMap: Map<string, EventListener>,
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add":
        if (change.newHandler) {
          const wrappedHandler = function (
            this: typeof dom,
            e: globalThis.Event,
          ) {
            const _e = new Proxy(e as any, {
              get: (target, prop, receiver) => {
                if (prop === "nativeEvent") {
                  return receiver;
                }
                const value = Reflect.get(target, prop, target);
                return typeof value === "function" ? value.bind(target) : value;
              },
              set: Reflect.set,
            });
            change.newHandler!.bind(this)(_e);
          };
          dom.addEventListener(change.eventName, wrappedHandler);
          eventMap.set(change.eventName, wrappedHandler);
        }
        break;
      case "update":
        // 移除旧事件处理器
        const oldHandler = eventMap.get(change.eventName);
        if (oldHandler) {
          dom.removeEventListener(change.eventName, oldHandler);
          eventMap.delete(change.eventName);
        }
        // 添加新事件处理器
        if (change.newHandler) {
          const wrappedHandler = function (
            this: typeof dom,
            e: globalThis.Event,
          ) {
            const _e = new Proxy(e as any, {
              get: (target, prop, receiver) => {
                if (prop === "nativeEvent") {
                  return receiver;
                }
                const value = Reflect.get(target, prop, target);
                return typeof value === "function" ? value.bind(target) : value;
              },
              set: Reflect.set,
            });
            change.newHandler!.bind(this)(_e);
          };
          dom.addEventListener(change.eventName, wrappedHandler);
          eventMap.set(change.eventName, wrappedHandler);
        }
        break;
      case "remove":
        const handler = eventMap.get(change.eventName);
        if (handler) {
          dom.removeEventListener(change.eventName, handler);
          eventMap.delete(change.eventName);
        }
        break;
    }
  }
}

export function isIterator<T extends unknown = unknown>(
  v: unknown,
): v is Iterable<T> {
  if ((typeof v === "object" && v !== null) || typeof v === "function") {
    return Reflect.has(v, Symbol.iterator);
  } else {
    return false;
  }
}

export function createElement<T extends Msom.JSX.ElementType>(
  type: T,
  config: Omit<Msom.H<T>, "children"> | null | undefined,
  ...children: Msom.MsomNode[]
): Msom.MsomElement {
  config = config || {};
  Reflect.deleteProperty(config, "__self");
  Reflect.deleteProperty(config, "__source");
  const _config = {
    ...config,
    children: children.map<Msom.MsomElement<any>>((v) => {
      const handle = (_v: Msom.MsomNode) => {
        if (isIterator(_v)) {
          return [..._v].map(handle);
        } else if (
          typeof _v === "object" ||
          _v === undefined ||
          _v === false ||
          _v === null
        ) {
          return _v;
        } else {
          return createTextElement(String(_v));
        }
      };
      return handle(v);
    }),
  };
  return {
    type,
    props: _config,
  };
}

export function createTextElement(text: string | Function): Msom.MsomElement {
  return {
    type: TEXT_NODE,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

export function isTextElement(
  v: Msom.MsomNode,
): v is Function | string | number | bigint | true {
  return (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "bigint" ||
    (typeof v === "boolean" && v === true) ||
    typeof v === "function"
  );
}

/**
 * 创建DOM元素并与VNode关联
 * @param element VNode元素
 * @returns 带有真实DOM的VNode
 */
function createDom<
  T extends Msom.JSX.ElementType | keyof Msom.JSX.IntrinsicElements,
>(element: Msom.MsomElement<T>): VNodeWithDOM {
  const {
    children,
    class: _class,
    style,
    $key,
    $ref,
    $context,
    ...props
  } = element.props;

  // 创建元素
  const dom =
    element.type === TEXT_NODE
      ? document.createTextNode("")
      : document.createElement(element.type as string);

  // 处理class
  if (_class) {
    props.className = `${parseClass(_class)} ${props.className || ""}`.trim();
  }

  // 处理style
  if (style) {
    Object.assign(props, { style: parseStyle(style) });
  }

  // 创建事件映射表
  const eventMap = new Map<string, EventListener>();

  // 处理事件
  Reflect.ownKeys(props)
    .filter((key) => typeof key === "string" && key.startsWith("on"))
    .forEach((key: string) => {
      const event = Reflect.get(props, key, props);
      Reflect.deleteProperty(props, key);

      const eventName = key.slice(2).toLowerCase();
      const wrappedHandler = function (this: typeof dom, e: globalThis.Event) {
        const _e = new Proxy(e as any, {
          get: (target, prop, receiver) => {
            if (prop === "nativeEvent") {
              return receiver;
            }
            const value = Reflect.get(target, prop, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
          set: Reflect.set,
        });
        event.bind(this)(_e);
      };

      dom.addEventListener(eventName, wrappedHandler);
      eventMap.set(eventName, wrappedHandler);
    });

  // 应用其他属性
  Object.assign(dom, props);

  // 创建带有DOM的VNode
  const vNodeWithDOM: VNodeWithDOM = {
    ...element,
    _dom: dom,
    _events: eventMap,
  };

  return vNodeWithDOM;
}

/**
 * 更新VNode的DOM元素
 * @param oldVNode 旧的VNode
 * @param newVNode 新的VNode
 * @returns 更新后的VNode
 */
export function updateVNodeDOM(
  oldVNode: VNodeWithDOM,
  newVNode: Msom.MsomElement,
): VNodeWithDOM {
  const dom = oldVNode._dom;
  const eventMap = oldVNode._events || new Map();

  if (!dom) {
    // 如果没有DOM元素，创建新的
    return createDom(newVNode);
  }

  // 比较属性变更
  const attributeChanges = compareAttributes(oldVNode.props, newVNode.props);
  applyAttributeChanges(dom, attributeChanges);

  // 比较事件变更
  const eventChanges = compareEvents(oldVNode.props, newVNode.props);
  applyEventChanges(dom, eventChanges, eventMap);
  // 递归比较更新子元素
  const newChildren = [newVNode.props.children].flat();
  const oldChildren = [oldVNode.props.children].flat();

  // 返回更新后的VNode
  return {
    ...newVNode,
    _dom: dom,
    _events: eventMap,
  };
}

const eventBindingMap = new WeakMap<
  WeakKey,
  { [K in PropertyKey]: Parameters<Event["on"]>[1] }
>();

const componentCache = new Map<any, IComponent>();

function _mountComponent(element: Msom.MsomElement<any>, container: Element) {
  withoutTrack(() => {
    let { children, $ref, ...props } = element.props;
    const componentDefinition = getComponentDefinition(element.type);
    if (!componentDefinition) {
      return;
    }

    // 处理自定义事件
    // 组件声明的事件
    const { $events } = componentDefinition;
    const $eventKeys = ownKeysAndPrototypeOwnKeys($events);
    const { ..._props } = props;
    // 去除props中的事件
    if ($eventKeys.size()) {
      for (const eventKey of $eventKeys) {
        if (Reflect.has(_props, eventKey)) {
          delete _props[eventKey];
        }
      }
    }

    // 获取或创建组件实例
    const component = (() => {
      let component = componentCache.get(_props.$key);
      if (!component) {
        component = new element.type(_props) as IComponent;
        _props.$key != undefined && componentCache.set(_props.$key, component);
      } else {
        component.set(_props as IComponentProps, true);
      }
      return component;
    })();

    // 处理传递的子元素
    children = [children].flat();
    if (children && children.length > 0) {
      const c = children.map((c) => {
        if (c.type === TEXT_NODE && typeof c.props.nodeValue === "function") {
          return c.props.nodeValue;
        } else {
          return c;
        }
      });
      component.setJSX(c.length > 1 ? c : c[0]);
    }
    // 处理ref
    if ($ref) {
      const _$ref = [$ref].flat();
      for (const ref of _$ref) {
        ref.set(component);
      }
    }

    // 事件绑定
    if ($eventKeys.size()) {
      const binding = eventBindingMap.get(component) || {};
      eventBindingMap.set(component, binding);
      for (const _key of $eventKeys) {
        const key = _key as keyof (typeof component extends IComponent<
          any,
          infer Es
        >
          ? Es
          : never);
        // 清除上次注册的事件
        component.un(key, binding[key]);
        Reflect.deleteProperty(binding, key);
        // 绑定新事件
        const on = props[key];
        if (on && typeof on === "function") {
          component.on(key, on);
          Object.assign(binding, { [key]: { on } });
        }
      }
    }
    // 生命周期: created
    component.created();

    // 设置组件所有者
    const domGlobalData = getGlobalData("@msom/dom") as $DOM;
    const { rendering } = domGlobalData;
    component.$owner = rendering;

    // 挂载组件
    component.onunmounted(
      createReaction(
        () => {
          // 获取旧的VNode
          const oldVNode = getComponentVNode(component);
          const wasMounted = component.isMounted();
          // 渲染新的VNode
          const newVNode = component.mount() || undefined;

          // 如果组件已挂载，使用新的完整VNode更新算法
          if (wasMounted && oldVNode) {
            if (!newVNode) {
              // 删除组件el
              container.removeChild(component.el);
              Object.assign(component, { el: null });
              setComponentVNode(component, null);
              return;
            }
            // 使用新的完整VNode更新算法
            const updatedVNode = updateVNodeComplete(
              oldVNode,
              newVNode as Msom.MsomElement,
              container as HTMLElement,
            );
            setComponentVNode(component, updatedVNode);
            component.rendered();
          } else {
            // 首次挂载，直接渲染新的VNode
            const dom = renderer(newVNode as Msom.MsomElement, container);
            component.rendered();
            setComponentVNode(component, newVNode as VNodeWithDOM);
            if (dom) {
              // 将类组件实例附着在dom上
              if (!Reflect.get(dom, "$owner")) {
                Object.assign(dom, { $owner: component });
              }
              container.appendChild(dom);

              // 运行mounted生命周期钩子
              wasMounted && component.mounted();
            }
          }
        },
        {
          scheduler: "nextFrame",
        },
      ).disposer(),
    );
  });
}

function renderer(
  element: Msom.MsomNode,
  container: Element,
): HTMLElement | Text | undefined {
  if (!element) {
    return;
  }

  if (typeof element !== "object") {
    element = createTextElement(
      typeof element === "function" ? element : String(element),
    );
  }
  if (isPromiseLike(element)) {
    element.then((e) => renderer(e, container));
    return;
  }
  if (isIterator(element)) {
    for (const e of element) {
      renderer(e, container);
    }
    return;
  }
  const _element = element as Exclude<typeof element, Iterable<any>> as any;
  let { children, $ref } = _element.props;
  if (typeof _element.type === "function") {
    if (isComponent(_element.type)) {
      // 类组件
      _mountComponent(_element, container);
    } else {
      // TODO: 函数组件
      // renderFunctionComponent(_element, container);
    }
  } else {
    // 普通元素
    const vNodeWithDOM = createDom(_element);
    const dom = vNodeWithDOM._dom;

    if (!dom) {
      return;
    }

    // 普通元素ref绑定生成的元素
    if ($ref) {
      const refs: IRef<any>[] = [$ref].flat();
      refs.forEach((ref) => ref.set(dom));
    }
    // children
    children = [children].flat();
    if (children && children.length > 0) {
      [...children].flat().forEach((child) => {
        const childDom = renderer(child, dom as HTMLElement);
        if (childDom) {
          dom.appendChild(childDom);
        }
      });
    }
    container.appendChild(dom);
    return dom;
  }
}

export function mountWith(
  mount: () => Msom.MsomElement | void,
  container: Element,
) {
  const element = mount();
  element && renderer(element, container);
}
export function mountComponent(component: IComponent, container: Element) {
  const element = component.mount();
  element && renderer(element, container);
}

// VNode管理工具现在从@msom/common导入

/**
 * 完整的VNode更新算法
 * 当VNode的type不同时，不递归更新子元素，而是生成新的真实元素替换旧元素
 * 当VNode的type相同时，直接操作旧VNode中的真实元素，并递归更新子元素
 * @param oldVNode 带有真实元素的旧VNode
 * @param newVNode 没有真实元素的新VNode
 * @param container 父真实元素容器
 * @returns 更新后的VNodeWithDOM
 */
export function updateVNodeComplete(
  oldVNode: VNodeWithDOM,
  newVNode: Msom.MsomElement,
  container: HTMLElement,
): VNodeWithDOM {
  // 如果type不同，生成新的真实元素替换旧元素
  if (oldVNode.type !== newVNode.type) {
    // 移除旧的事件监听器
    if (oldVNode._events && oldVNode._dom instanceof HTMLElement) {
      oldVNode._events.forEach((handler, eventName) => {
        oldVNode._dom!.removeEventListener(eventName, handler);
      });
    }

    // 创建新的VNodeWithDOM
    const newVNodeWithDOM = createDom(newVNode);

    // 在父容器中保持原有位置替换元素
    if (oldVNode._dom && newVNodeWithDOM._dom) {
      // 获取旧元素在父容器中的位置
      const oldIndex = Array.from(container.children).indexOf(
        oldVNode._dom as HTMLElement,
      );

      if (oldIndex !== -1) {
        // 在原有位置插入新元素
        container.insertBefore(
          newVNodeWithDOM._dom,
          container.children[oldIndex],
        );
        // 移除旧元素
        container.removeChild(oldVNode._dom);
      } else {
        // 如果找不到位置，直接替换
        container.replaceChild(newVNodeWithDOM._dom, oldVNode._dom);
      }
    }

    return newVNodeWithDOM;
  }

  // type相同，更新属性和事件，并递归更新子元素
  const updatedVNode = { ...newVNode } as VNodeWithDOM;
  updatedVNode._dom = oldVNode._dom;
  updatedVNode._events = oldVNode._events || new Map();

  // 更新属性
  const attributeChanges = compareAttributes(oldVNode.props, newVNode.props);
  if (attributeChanges.length > 0 && updatedVNode._dom instanceof HTMLElement) {
    applyAttributeChanges(updatedVNode._dom, attributeChanges);
  }

  // 更新事件
  const eventChanges = compareEvents(oldVNode.props, newVNode.props);
  if (eventChanges.length > 0 && updatedVNode._dom instanceof HTMLElement) {
    applyEventChanges(updatedVNode._dom, eventChanges, updatedVNode._events);
  }

  // 递归更新子元素
  const oldChildren = Array.isArray(oldVNode.props.children)
    ? oldVNode.props.children
    : oldVNode.props.children
      ? [oldVNode.props.children]
      : [];
  const newChildren = Array.isArray(newVNode.props.children)
    ? newVNode.props.children
    : newVNode.props.children
      ? [newVNode.props.children]
      : [];

  if (updatedVNode._dom instanceof HTMLElement) {
    updateChildren(updatedVNode._dom, oldChildren, newChildren);
  }

  return updatedVNode;
}

/**
 * 更新子元素
 * @param parentDom 父DOM元素
 * @param oldChildren 旧的子VNode数组
 * @param newChildren 新的子VNode数组
 */
function updateChildren(
  parentDom: HTMLElement,
  oldChildren: Msom.MsomNode[],
  newChildren: Msom.MsomNode[],
): void {
  const oldChildDoms: (HTMLElement | Text)[] = [];
  const newChildVNodes: Msom.MsomElement[] = [];

  // 收集旧的子DOM元素
  for (let i = 0; i < parentDom.childNodes.length; i++) {
    const child = parentDom.childNodes[i];
    if (child instanceof HTMLElement || child instanceof Text) {
      oldChildDoms.push(child);
    }
  }

  // 过滤出有效的子VNode
  for (const child of newChildren) {
    if (child && typeof child === "object" && "type" in child) {
      newChildVNodes.push(child as Msom.MsomElement);
    }
  }

  // 简单的diff算法：按索引更新
  const maxLength = Math.max(oldChildDoms.length, newChildVNodes.length);

  for (let i = 0; i < maxLength; i++) {
    const oldChildDom = oldChildDoms[i];
    const newChildVNode = newChildVNodes[i];

    if (oldChildDom && newChildVNode) {
      // 更新现有元素
      if (oldChildDom instanceof HTMLElement) {
        // 直接创建新元素并替换
        const updatedChild = createDom(newChildVNode);
        if (updatedChild._dom) {
          parentDom.replaceChild(updatedChild._dom, oldChildDom);
        }
      }
    } else if (oldChildDom && !newChildVNode) {
      // 删除多余的元素
      parentDom.removeChild(oldChildDom);
    } else if (!oldChildDom && newChildVNode) {
      // 添加新元素
      const newChild = createDom(newChildVNode);
      if (newChild._dom) {
        parentDom.appendChild(newChild._dom);
      }
    }
  }
}
