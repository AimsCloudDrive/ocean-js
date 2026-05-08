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
  isArray,
  isPromiseLike,
} from "@msom/common";
import { createReaction, Observer, withoutTrack } from "@msom/reaction";
import {
  createElement,
  createTextElement,
  isIterator,
  isTextElement,
  TEXT_NODE,
} from "./element";
import { IComponent, IComponentProps } from "./IComponent";
import { IRef } from "./Ref";
import { VNode, DOMElement, EventProxy, createEventProxy, VNodeProps } from "./types";

type $DOM = {
  rendering?: IComponent;
};

const renderingKey = Symbol("rendering");

getGlobalData("@msom/dom") || (getGlobalData("@msom/dom") as Record<string, unknown>) || {};

type FiberType = string | ((props: any) => VNode) | (new (props: any) => IComponent);

interface Fiber {
  type?: FiberType | null;
  dom: DOMElement | null;
  props: VNodeProps;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
  component: IComponent | null;
  rootFiber: Fiber | null;
}

/**
 * 创建DOM元素并与VNode关联
 * @param element VNode元素
 * @returns 带有真实DOM的VNode
 */
function createDom(fiber: Fiber): DOMElement {
  const dom =
    fiber.type === TEXT_NODE
      ? document.createTextNode("")
      : document.createElement(fiber.type as string);
  updateDom(dom, {} as VNodeProps, fiber.props);
  return dom;
}

const DOMEVENTBINDSYMBOL = Symbol("eb");

function updateDom(dom: DOMElement, prevProps: VNodeProps, nextProps: VNodeProps): void {
  const {
    $ref,
    $context,
    children,
    class: _class,
    className,
    style,
    ...props
  } = nextProps;
  
  if (dom instanceof HTMLElement) {
    dom.className = "";
    dom.style = "";
  }

  const eventMap = dom[DOMEVENTBINDSYMBOL] || new Map<string, EventListener>();
  dom[DOMEVENTBINDSYMBOL] = eventMap;
  
  if (prevProps) {
    const { children: prevChildren, $key, $ref: prevRef, $context: prevContext, ...prevRestProps } = prevProps;
    Reflect.ownKeys(prevRestProps).forEach((key) => {
      if (typeof key === "string" && key.startsWith("on")) {
        const eventName = key.slice(2).toLocaleLowerCase();
        const e = eventMap.get(eventName);
        if (e) {
          dom.removeEventListener(eventName, e);
        }
      } else if (dom instanceof HTMLElement) {
        dom.removeAttribute(key);
      }
    });
  }
  
  if (_class && dom instanceof HTMLElement) {
    dom.className = `${className || ""} ${parseClass(_class)}`.trim();
  }

  if (style && dom instanceof HTMLElement) {
    dom.style = parseStyle(style) as CSSStyleDeclaration;
  }

  const eventProps = new Map<string, EventListener>();
  Reflect.ownKeys(props)
    .filter((key): key is string => typeof key === "string" && key.startsWith("on"))
    .forEach((key: string) => {
      const event = Reflect.get(props, key) as EventListener;
      const eventName = key.slice(2).toLowerCase();
      dom.addEventListener(eventName, event);
      eventProps.set(eventName, event);
    });
  
  const remainingProps: Record<string, unknown> = {};
  Reflect.ownKeys(props)
    .filter((key) => !String(key).startsWith("on"))
    .forEach((key) => {
      remainingProps[String(key)] = Reflect.get(props, key);
    });
  
  Object.assign(dom as HTMLElement, remainingProps);
  
  const refs = [$ref].flat().filter((ref): ref is IRef<DOMElement> => ref !== undefined && typeof ref === "object" && "set" in ref);
  if (refs.length) {
    refs.forEach((ref) => {
      ref.set(dom);
    });
  }
}

const wipRoot = new Observer<Fiber | null>();
wipRoot.destroy();
const currentRoot = new Observer<Fiber>();
currentRoot.destroy();
const deletions = new Observer<Fiber[]>();
deletions.destroy();
const nextUnitOfWork = new Observer<Fiber | null>();
nextUnitOfWork.destroy();

export function render(
  element: Msom.MsomElement,
  container: HTMLElement,
  _wipRoot: Observer<Fiber | null> = wipRoot,
  _currentRoot: Observer<Fiber> = currentRoot,
) {
  deletions.set(deletions.get() || []);
  _wipRoot.set({
    parent: null,
    dom: container,
    props: { children: [element] },
    alternate: _currentRoot.get(),
    type: null,
    effectTag: null,
    child: null,
    sibling: null,
    component: null,
    rootFiber: null,
  });
  nextUnitOfWork.set(_wipRoot.get());
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
    rootFiber: null,
  };
}

function reconcileChildren(fiber: Fiber, elements?: Msom.MsomElement<any>[]) {
  let index = 0;
  let prevSibling: Fiber | null = null;
  if (!elements) {
    return;
  }
  let oldFiber = fiber.alternate && fiber.alternate.child;
  // 构建旧fiber的key映射，用于高效查找
  const oldFiberMap = new Map<string | number, Fiber>();
  let tempOldFiber = oldFiber;
  while (tempOldFiber) {
    const key = tempOldFiber.props?.$key ?? index;
    oldFiberMap.set(key, tempOldFiber);
    tempOldFiber = tempOldFiber.sibling;
  }
  
  while (index < elements?.length || oldFiber != null) {
    const element = elements[index];
    const key = element?.props?.$key ?? index;
    const oldFiberByKey = oldFiberMap.get(key);
    const sameType = oldFiberByKey && element && oldFiberByKey.type === element.type;
    const sameKey = oldFiberByKey && element && 
                   (oldFiberByKey.props?.$key === element.props?.$key || 
                    oldFiberByKey.props?.$key === undefined && element.props?.$key === undefined);
    let newFiber: Fiber | null = null;
    
    if (sameType && sameKey) {
      // 类型和key都相同，复用旧fiber
      assert(oldFiberByKey);
      newFiber = {
        type: oldFiberByKey.type,
        child: null,
        sibling: null,
        props: element.props,
        parent: fiber,
        dom: oldFiberByKey.dom,
        alternate: oldFiberByKey,
        effectTag: "UPDATE",
        component: oldFiberByKey.component,
        rootFiber: null,
      };
      oldFiberMap.delete(key);
    } else if (element && !sameType) {
      // 类型不同但有新元素
      newFiber = createFiber(element, fiber);
    }
    if (oldFiberByKey && !sameType) {
      // 类型不同，标记删除旧的
      oldFiberByKey.effectTag = "DELETION";
      deletions.get().push(oldFiberByKey);
    }
    // 清理已匹配的旧fiber
    if (oldFiberByKey) {
      oldFiberMap.delete(key);
    }
    if (index === 0) {
      fiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
  // 清理未匹配到的旧fiber
  oldFiberMap.forEach((orphanFiber) => {
    orphanFiber.effectTag = "DELETION";
    deletions.get().push(orphanFiber);
  });
}

interface FiberSnapshot {
  props: VNodeProps;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
  dom: DOMElement | null;
}

class FiberTransaction {
  private snapshots = new Map<Fiber, FiberSnapshot>();
  isActive = false;
  
  begin() {
    this.isActive = true;
    this.snapshots.clear();
  }
  
  snapshot(fiber: Fiber) {
    if (!this.isActive) return;
    
    if (!this.snapshots.has(fiber)) {
      this.snapshots.set(fiber, {
        props: { ...fiber.props },
        effectTag: fiber.effectTag,
        dom: fiber.dom
      });
    }
  }
  
  commit() {
    this.isActive = false;
    this.snapshots.clear();
  }
  
  rollback() {
    this.snapshots.forEach((snapshot, fiber) => {
      fiber.props = snapshot.props;
      fiber.effectTag = snapshot.effectTag;
      fiber.dom = snapshot.dom;
    });
    this.isActive = false;
    this.snapshots.clear();
  }
}

const fiberTransaction = new FiberTransaction();

function workLoop(deadline: IdleDeadline) {
  if (!fiberTransaction.isActive) {
    fiberTransaction.begin();
  }
  
  while (nextUnitOfWork.get() && deadline.timeRemaining() > 0) {
    const fiber = nextUnitOfWork.get()!;
    fiberTransaction.snapshot(fiber);
    
    try {
      const _nextUnitOfWork = performUnitOfWork(fiber);
      nextUnitOfWork.set(_nextUnitOfWork);
    } catch (error) {
      console.error('Fiber processing error:', error);
      fiberTransaction.rollback();
      throw error;
    }
  }
  
  if (!nextUnitOfWork.get() && wipRoot.get()) {
    try {
      commitRoot();
      fiberTransaction.commit();
    } catch (error) {
      console.error('Commit error:', error);
      fiberTransaction.rollback();
      throw error;
    }
  }
  
  requestIdleCallback(workLoop);
}

const eventBindingKey = Symbol("eventBinding");
type EventStop = () => void;
type EventBinding = Record<string, EventStop>;

function performUnitOfWork(fiber: Fiber): Fiber | null {
  try {
    return performUnitOfWorkInner(fiber);
  } catch (error) {
    console.error('Component render error:', error);
    
    // 查找最近的ErrorBoundary
    let parent = fiber.parent;
    while (parent) {
      if (parent.component && isErrorBoundary(parent.component)) {
        parent.component.state = {
          hasError: true,
          error: error instanceof Error ? error : new Error(String(error))
        };
        return parent.sibling;
      }
      parent = parent.parent;
    }
    
    throw error;
  }
}

function isErrorBoundary(component: IComponent): boolean {
  return 'getDerivedStateFromError' in component || 'componentDidCatch' in component;
}

function performUnitOfWorkInner(fiber: Fiber): Fiber | null {
  if (
    typeof fiber.type === "function" &&
    fiber.type !== null &&
    isComponent(fiber.type)
  ) {
    // 自定义类组件
    let { children, $ref, ...props } = fiber.props;
    const componentDefinition = getComponentDefinition(fiber.type as any);
    if (!componentDefinition) {
      return null;
    }

    // 处理自定义事件
    const { $events } = componentDefinition;
    const $eventKeys = ownKeysAndPrototypeOwnKeys($events);
    const newProps = {} as typeof props;
    // 获取自定义属性
    const $props = componentDefinition.$options;
    const $propKeys = ownKeysAndPrototypeOwnKeys($props);
    if ($propKeys.size()) {
      for (const propKey of $propKeys) {
        if (Reflect.has(props, propKey)) {
          newProps[propKey] = props[propKey];
        }
      }
    }

    // 获取或创建组件实例
    const component = (() => {
      // 获取key用于复用判断
      const oldKey = fiber.alternate?.props?.$key;
      const newKey = props.$key;
      const sameKey = oldKey === newKey || 
                     (oldKey === undefined && newKey === undefined);
      
      // 如果是更新，尝试从旧的fiber中获取组件实例
      if (
        fiber.alternate?.component &&
        (Object.is(fiber.alternate.type, fiber.type) || sameKey)
      ) {
        const oldComponent = fiber.alternate.component;
        oldComponent.set(newProps as IComponentProps, true);
        return oldComponent;
      }
      // 创建新实例
      const ComponentType = fiber.type as new (props: VNodeProps) => IComponent;
      const component = new ComponentType(newProps);
      // 生命周期: created
      component.created();
      return component;
    })();

    // 存储组件实例到fiber
    fiber.component = component;

    // 处理传递的子元素
    children = [children].flat();
    const processC = <T>(cs: T[]): T[] => {
      return children.map((c) => {
        if (
          typeof c === "object" &&
          c !== null &&
          "type" in c &&
          c.type === TEXT_NODE &&
          typeof (c as VNode).props?.nodeValue === "function"
        ) {
          return (c as VNode).props.nodeValue;
        } else {
          return c;
        }
      });
    };
    if (children) {
      if (isArray(children)) {
        const c = processC(children);
        component.setJSX(c);
      } else {
        component.setJSX(processC([children])[0]);
      }
    }
    // 处理ref
    if ($ref) {
      const _$ref = [$ref].flat();
      for (const ref of _$ref) {
        if (typeof ref === "object" && "set" in ref) {
          (ref as IRef<IComponent>).set(component);
        }
      }
    }
    // 事件绑定
    // 删除旧事件
    const oldEvents = Reflect.get(component, eventBindingKey) as EventBinding;
    if (oldEvents) {
      Object.values(oldEvents).forEach((stop) => stop());
      Reflect.deleteProperty(component, eventBindingKey);
    }
    // 绑定新事件
    if ($eventKeys.size()) {
      const binding = {} as EventBinding;
      $eventKeys.each((newEK: string) => {
        const on = props[newEK];
        if (on && typeof on === "function") {
          const c = component as Event<any>;
          (c as Event<any>).on(newEK, on);
          binding[newEK] = () => c.un(newEK, on);
        }
      });
      Reflect.set(component, eventBindingKey, binding);
    }
    // 设置组件树
    let p = fiber.parent;
    while (p) {
      if (p.component) {
        component.$owner = p.component;
        break;
      }
      p = p.parent;
    }
    // 生命周期: setup
    component.setup();
    //
    fiber.dom = fiber.parent?.dom || null;
    const processRender = (
      v: Msom.MsomNode,
      wipRoot: Observer<Fiber>,
      currentRoot: Observer<Fiber>,
    ) => {
      assert(fiber.dom);
      if (v === undefined || v === null || v === false) {
        return;
      }
      if (isPromiseLike<any, any>(v)) {
        v.then((res) => processRender(res, wipRoot, currentRoot));
      } else if (isArray(v) || isIterator(v)) {
        for (v of v) {
          processRender(v, wipRoot, currentRoot);
        }
      } else if (isTextElement(v)) {
        render(
          createTextElement(v.toString()),
          fiber.dom as HTMLElement,
          wipRoot,
          currentRoot,
        );
      } else {
        render(v, fiber.dom as HTMLElement, wipRoot, currentRoot);
      }
    };
    // 渲染组件内容
    // 生成更新时的工作根
    const root = component[renderingKey] || {
      wipRoot: new Observer(),
      currentRoot: new Observer({ initValue: fiber }), // 当前fiber即为当前根
    };
    component[renderingKey] = root;
    const updateHandle = () => {
      let newVNode = component.render();
      if (newVNode) {
        processRender(newVNode, root.wipRoot, root.currentRoot);
      }
    };
    // 首次渲染链接已经存在的工作根
    let ne: any = null;
    // 注册组件内部更新回调
    component.onunmounted(
      createReaction(
        () => {
          ne = component.render();
        },
        updateHandle, // 后续更新将从该组件开始更新
        { scheduler: "nextTick" },
      ).disposer(),
    );
    // 处理不同类型的子元素
    const processRender2 = (v: Msom.MsomNode) => {
      assert(fiber.dom);
      if (v === undefined || v === null || v === false) {
        return;
      }
      if (isPromiseLike<any, any>(v)) {
        // 处理Promise-like对象,新开工作根
        processRender(v, root.wipRoot, root.currentRoot);
      } else if (isArray(v) || isIterator(v)) {
        for (v of v) {
          processRender2(v);
        }
      } else if (isTextElement(v)) {
        fiber.props.children = createTextElement(v.toString());
      } else {
        fiber.props.children = v;
      }
    };
    // 首次渲染链接到当前工作根
    processRender2(ne);
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
    const newVNode = component.render() || undefined;

    if (fiber.effectTag === "UPDATE" && oldVNode && newVNode) {
      const container = domParent as HTMLElement;
      const oldDom = component.el;

      if (wasMounted && oldDom && newVNode.type === oldVNode.type) {
        // 类型相同，in-place更新
        updateVNodeInPlace(oldDom as HTMLElement, oldVNode, newVNode as Msom.MsomElement);
      } else if (wasMounted && oldDom && container.contains(oldDom as Node)) {
        // 类型改变，替换DOM
        container.removeChild(oldDom as Node);
        
        const tempContainer = document.createDocumentFragment();
        renderComponentVNode(newVNode as Msom.MsomElement, tempContainer, component);
        
        while (tempContainer.firstChild) {
          const child = tempContainer.firstChild;
          container.appendChild(child);
          if (child instanceof HTMLElement && !Reflect.get(child, "$owner")) {
            Object.assign(child, { $owner: component });
          }
        }
      } else {
        // 首次挂载
        const tempContainer = document.createDocumentFragment();
        renderComponentVNode(newVNode as Msom.MsomElement, tempContainer, component);
        
        while (tempContainer.firstChild) {
          const child = tempContainer.firstChild;
          container.appendChild(child);
          if (child instanceof HTMLElement && !Reflect.get(child, "$owner")) {
            Object.assign(child, { $owner: component });
          }
        }
      }

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
  component: IComponent,
): void {
  if (!vnode) {
    return;
  }

  // 处理不同类型的VNode
  if (vnode.type === TEXT_NODE) {
    const textNode = document.createTextNode(
      String(vnode.props.nodeValue || ""),
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
          nestedComponent,
        );
      }
      nestedComponent.rendered();
      nestedComponent.mounted();
    }
  }
}

function updateVNodeInPlace(
  dom: HTMLElement,
  oldVNode: VNode,
  newVNode: Msom.MsomElement
): void {
  if (!oldVNode || !newVNode) return;
  
  const { children, class: _class, style, $key, $ref, ...restProps } = newVNode.props;
  
  if (_class) {
    dom.className = parseClass(_class);
  }
  
  if (style) {
    dom.style.cssText = parseStyle(style);
  }
  
  Object.assign(dom, restProps);
}

if (process.env.NODE_ENV === 'development') {
  Object.defineProperty(window, '__MSOM_DEVTOOLS__', {
    value: {
      wipRoot,
      currentRoot,
      deletions,
      nextUnitOfWork,
      commitRoot,
    },
    writable: false,
    configurable: true
  });
}
