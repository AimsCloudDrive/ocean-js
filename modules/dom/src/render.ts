import {
  assert,
  isComponent,
  parseClass,
  parseStyle,
  getComponentDefinition,
  getGlobalData,
  ownKeysAndPrototypeOwnKeys,
  getComponentVNode,
  setComponentVNode,
  Event,
} from "@msom/common";
import { createReaction, Observer, withoutTrack } from "@msom/reaction";
import { TEXT_NODE } from "./element";
import { IComponent, IComponentProps } from "./IComponent";
import { IRef } from "./Ref";

type $DOM = {
  rendering?: IComponent;
};

getGlobalData("@msom/dom") || (getGlobalData("@msom/dom") as any) || {};

const componentCache = new Map<any, IComponent>();
const eventBindingMap = new WeakMap<
  WeakKey,
  { [K in PropertyKey]: Parameters<Event["on"]>[1] }
>();

interface Fiber {
  type?: keyof Msom.JSX.ElementTypeMap | null;
  dom: HTMLElement | Text | null;
  props: Msom.H<any>;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
  component: IComponent | null; // 类组件实例
}

/**
 * 创建DOM元素并与VNode关联
 * @param element VNode元素
 * @returns 带有真实DOM的VNode
 */
function createDom(fiber: Fiber): Text | HTMLElement {
  const {
    children,
    class: _class,
    style,
    $key,
    $ref,
    $context,
    ...props
  } = fiber.props;

  // 创建元素
  const dom =
    fiber.type === TEXT_NODE
      ? document.createTextNode("")
      : document.createElement(fiber.type as string);
  updateDom(dom as any, {} as any, props as any);
  return dom;
}

const DOMEVENTBINDSYMBOL = Symbol("eb");

function updateDom<
  T extends Msom.JSX.ElementType | keyof Msom.JSX.IntrinsicElements
>(dom: HTMLElement | Text, prevProps: Msom.H<T>, nextProps: Msom.H<T>) {
  const {
    children,
    class: _class,
    style,
    $key,
    $ref,
    $context,
    ...props
  } = nextProps;
  if (dom instanceof HTMLElement) {
    dom.className = "";
    dom.style = "";
  }

  // 创建事件映射表
  const eventMap = dom[DOMEVENTBINDSYMBOL] || new Map<string, EventListener>();
  dom[DOMEVENTBINDSYMBOL] = eventMap;
  {
    const {
      children,
      class: _class,
      style,
      $key,
      $ref,
      $context,
      ...props
    } = prevProps;
    Reflect.ownKeys(props).forEach((key) => {
      if (typeof key === "string" && key.startsWith("on")) {
        const ek = key.slice(2).toLocaleLowerCase();
        const e = dom[DOMEVENTBINDSYMBOL]?.get(ek);
        if (e) {
          dom.removeEventListener(key.slice(2).toLocaleLowerCase(), e);
        }
      } else {
        dom[key] = "";
      }
    });
  }
  // 处理class
  if (_class && dom instanceof HTMLElement) {
    props.className = `${parseClass(_class)} ${props.className || ""}`.trim();
  } else {
    Reflect.deleteProperty(props, "class");
    Reflect.deleteProperty(props, "className");
  }

  // 处理style
  if (style && dom instanceof HTMLElement) {
    Object.assign(props, { style: parseStyle(style) });
  } else {
    Reflect.deleteProperty(props, "style");
  }

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
  return dom;
}

const wipRoot = new Observer<Fiber | null>();
const currentRoot = new Observer<Fiber>();
const deletions = new Observer<Fiber[]>();
const nextUnitOfWork = new Observer<Fiber | null>();

export function render(element: Msom.MsomElement, container: HTMLElement) {
  deletions.set([]);
  wipRoot.set({
    parent: null,
    dom: container,
    props: { children: [element] },
    alternate: currentRoot.get(),
    type: null,
    effectTag: null,
    child: null,
    sibling: null,
    component: null,
  });
  nextUnitOfWork.set(wipRoot.get());
  requestIdleCallback(workLoop);
}

function createFiber(element: Msom.MsomElement, fiber: Fiber): Fiber {
  return {
    type: element.type as keyof Msom.JSX.ElementTypeMap,
    props: element.props,
    parent: fiber,
    dom: null,
    sibling: null,
    child: null,
    effectTag: "PLACEMENT",
    alternate: null,
    component: null,
  };
}

function reconcileChildren(fiber: Fiber, elements?: Msom.MsomElement<any>[]) {
  let index = 0;
  let prevSibling: Fiber | null = null;
  if (!elements) {
    return;
  }
  let oldFiber = fiber.alternate && fiber.alternate.child;
  while (index < elements?.length || oldFiber != null) {
    const element = elements[index];
    const sameType = oldFiber && element && oldFiber.type === element.type;
    let newFiber: Fiber | null = null;
    if (sameType) {
      assert(oldFiber);
      newFiber = {
        type: oldFiber.type,
        child: null,
        sibling: null,
        props: element.props,
        parent: fiber,
        dom: oldFiber.dom,
        alternate: oldFiber,
        effectTag: "UPDATE",
        component: oldFiber.component, // 保留组件实例
      };
    }
    if (element && !sameType) {
      newFiber = createFiber(element, fiber);
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.get().push(oldFiber);
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}
function workLoop(deadline: IdleDeadline) {
  while (nextUnitOfWork.get() && deadline.timeRemaining() > 0) {
    const _nextUnitOfWork = performUnitOfWork(nextUnitOfWork.get()!);
    nextUnitOfWork.set(_nextUnitOfWork);
  }
  if (!nextUnitOfWork.get() && wipRoot.get()) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  if (
    typeof fiber.type === "function" &&
    fiber.type !== null &&
    isComponent(fiber.type)
  ) {
    // 自定义类组件
    withoutTrack(() => {
      let { children, $ref, ...props } = fiber.props;
      const componentDefinition = getComponentDefinition(fiber.type as any);
      if (!componentDefinition) {
        return;
      }

      // 处理自定义事件
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
        // 如果是更新，尝试从旧的fiber中获取组件实例
        if (fiber.alternate?.component) {
          const oldComponent = fiber.alternate.component;
          oldComponent.set(_props as IComponentProps, true);
          return oldComponent;
        }
        // 否则创建新实例或从缓存获取
        let component = componentCache.get(_props.$key);
        if (!component) {
          const ComponentType = fiber.type as unknown as new (
            ...args: unknown[]
          ) => IComponent;
          component = new ComponentType(_props) as IComponent;
          _props.$key != undefined &&
            componentCache.set(_props.$key, component);
        } else {
          component.set(_props as IComponentProps, true);
        }
        return component;
      })();

      // 存储组件实例到fiber
      fiber.component = component;

      // 处理传递的子元素
      children = [children].flat();
      if (children && children.length > 0) {
        const c = children.map((c) => {
          if (
            typeof c === "object" &&
            c !== null &&
            "type" in c &&
            c.type === TEXT_NODE &&
            typeof (c as any).props?.nodeValue === "function"
          ) {
            return (c as any).props.nodeValue;
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
          (ref as IRef<any>).set(component);
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
      if (!fiber.alternate?.component) {
        component.created();
      }

      // 设置组件所有者
      const domGlobalData = getGlobalData("@msom/dom") as $DOM;
      const { rendering } = domGlobalData;
      component.$owner = rendering;

      // 渲染组件内容
      const wasMounted = component.isMounted();
      const newVNode = component.mount();

      if (newVNode) {
        // 将组件渲染的内容作为children
        // 确保children是数组格式
        const childrenArray = Array.isArray(newVNode)
          ? newVNode
          : [newVNode].filter(Boolean);
        fiber.props = {
          ...fiber.props,
          children:
            childrenArray.length === 1 ? childrenArray[0] : childrenArray,
        };
      }
    });
  } else if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, [elements].flat());
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

function commitRoot() {
  const wip = wipRoot.get()!;
  deletions.get().forEach(commitWork);
  commitWork(wip.child);
  currentRoot.set(wip);
  wipRoot.set(null);
}
function commitWork(fiber?: Fiber | null) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent?.dom;
  assert(domParent);

  // 处理类组件
  if (fiber.component) {
    const component = fiber.component;
    const wasMounted = component.isMounted();
    const oldVNode = getComponentVNode(component);
    const newVNode = component.mount() || undefined;

    if (fiber.effectTag === "UPDATE" && oldVNode && newVNode) {
      // 更新组件
      // 这里需要递归渲染新的VNode并更新DOM
      // 由于Fiber架构的特性，我们需要手动处理组件的DOM更新
      const container = domParent as HTMLElement;

      // 如果组件已挂载，需要更新DOM
      if (wasMounted) {
        // 获取组件当前的DOM元素
        const componentDom = component.el;
        if (componentDom && container.contains(componentDom)) {
          // 移除旧的DOM
          container.removeChild(componentDom);
        }
      }

      // 渲染新的VNode到临时容器
      const tempContainer = document.createDocumentFragment();
      renderComponentVNode(
        newVNode as Msom.MsomElement,
        tempContainer,
        component
      );

      // 将新DOM添加到父容器
      while (tempContainer.firstChild) {
        const child = tempContainer.firstChild;
        container.appendChild(child);
        // 将类组件实例附着在dom上
        if (child instanceof HTMLElement && !Reflect.get(child, "$owner")) {
          Object.assign(child, { $owner: component });
        }
      }

      // 更新组件VNode
      const vNodeWithDOM = getComponentVNode(component);
      if (vNodeWithDOM) {
        setComponentVNode(component, vNodeWithDOM);
      }
      component.rendered();
    } else if (fiber.effectTag === "PLACEMENT" && newVNode) {
      // 首次挂载组件
      const container = domParent as HTMLElement;
      renderComponentVNode(newVNode as Msom.MsomElement, container, component);
      component.rendered();

      // 运行mounted生命周期钩子（首次挂载时）
      if (!wasMounted) {
        component.mounted();
      }
    } else if (fiber.effectTag === "DELETION") {
      // 卸载组件
      const container = domParent as HTMLElement;
      const componentDom = component.el;
      if (componentDom && container.contains(componentDom)) {
        container.removeChild(componentDom);
      }
      component.unmount();
      setComponentVNode(component, null);
    }
  } else {
    // 处理普通元素
    if (fiber.effectTag === "UPDATE") {
      const d = fiber.dom;
      d && updateDom(d, fiber.alternate!.props, fiber.props);
    } else if (fiber.effectTag === "PLACEMENT") {
      assert(fiber.dom);
      domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "DELETION") {
      fiber.dom && domParent.removeChild(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 渲染组件VNode到容器
 * @param vnode 组件的VNode
 * @param container 容器元素
 * @param component 组件实例
 */
function renderComponentVNode(
  vnode: Msom.MsomElement,
  container: HTMLElement | DocumentFragment,
  component: IComponent
): void {
  if (!vnode) {
    return;
  }

  // 处理不同类型的VNode
  if (vnode.type === TEXT_NODE) {
    const textNode = document.createTextNode(
      String(vnode.props.nodeValue || "")
    );
    container.appendChild(textNode);
    setComponentVNode(component, {
      ...vnode,
      _dom: textNode,
      _events: new Map(),
    } as any);
    return;
  }

  if (typeof vnode.type === "string") {
    // 普通DOM元素
    const dom = document.createElement(vnode.type);
    const { children, class: _class, style, $ref, ...props } = vnode.props;

    // 处理class
    if (_class) {
      props.className = `${parseClass(_class)} ${props.className || ""}`.trim();
    }

    // 处理style
    if (style) {
      Object.assign(props, { style: parseStyle(style) });
    }

    // 处理事件
    const eventMap = new Map<string, EventListener>();
    Reflect.ownKeys(props)
      .filter((key) => typeof key === "string" && key.startsWith("on"))
      .forEach((key: string) => {
        const event = Reflect.get(props, key, props);
        Reflect.deleteProperty(props, key);
        const eventName = key.slice(2).toLowerCase();
        const wrappedHandler = function (
          this: typeof dom,
          e: globalThis.Event
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
          event.bind(this)(_e);
        };
        dom.addEventListener(eventName, wrappedHandler);
        eventMap.set(eventName, wrappedHandler);
      });

    // 应用其他属性
    Object.assign(dom, props);

    // 处理ref
    if ($ref) {
      const refs: IRef<any>[] = [$ref].flat();
      refs.forEach((ref) => ref.set(dom));
    }

    // 递归处理children
    const childrenArray = [children].flat();
    if (childrenArray && childrenArray.length > 0) {
      childrenArray.forEach((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          renderComponentVNode(child as Msom.MsomElement, dom, component);
        }
      });
    }

    container.appendChild(dom);
    setComponentVNode(component, {
      ...vnode,
      _dom: dom,
      _events: eventMap,
    } as any);
  } else if (typeof vnode.type === "function") {
    // 嵌套组件，递归渲染
    if (isComponent(vnode.type)) {
      // 这里可以递归处理嵌套的类组件
      // 为了简化，暂时只处理一层
      const nestedComponent = new (vnode.type as new (
        ...args: unknown[]
      ) => IComponent)(vnode.props) as IComponent;
      nestedComponent.created();
      const nestedVNode = nestedComponent.mount();
      if (nestedVNode) {
        renderComponentVNode(
          nestedVNode as Msom.MsomElement,
          container,
          nestedComponent
        );
      }
      nestedComponent.rendered();
      nestedComponent.mounted();
    }
  }
}

Object.assign(window, {
  bbbb: {
    wipRoot,
    currentRoot,
    deletions,
    nextUnitOfWork,
    commitRoot,
  },
});
