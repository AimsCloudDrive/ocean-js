import {
  assert,
  isComponent,
  parseClass,
  parseStyle,
  getComponentDefinition,
  ownKeysAndPrototypeOwnKeys,
  getComponentVNode,
  setComponentVNode,
  Event,
  isArray,
  isPromiseLike,
} from "@msom/common";
import { createReaction } from "@msom/reaction";
import {
  createElement,
  createTextElement,
  isIterator,
  isTextElement,
  TEXT_NODE,
} from "./element";
import { IComponent, IComponentProps } from "./IComponent";
import { IRef } from "./Ref";
import { VNode, DOMElement, VNodeProps } from "./types";

const reactionDisposerKey = Symbol("reactionDisposer");

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
  /** 渲染阶段生成的 VNode，commit 阶段直接复用，避免重复调用 render() 建立响应式依赖 */
  renderedVNode: Msom.MsomElement | null;
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

  // 清空旧样式和类名
  if (dom instanceof HTMLElement) {
    dom.className = "";
    dom.style.cssText = "";
  }

  // 获取或创建事件映射表
  const eventMap: Map<string, EventListener> =
    (dom as any)[DOMEVENTBINDSYMBOL] || new Map<string, EventListener>();
  (dom as any)[DOMEVENTBINDSYMBOL] = eventMap;

  // 移除旧属性和事件
  if (prevProps) {
    const {
      children: _prevChildren,
      $key: _prevKey,
      $ref: _prevRef,
      $context: _prevContext,
      ...prevRestProps
    } = prevProps;
    Reflect.ownKeys(prevRestProps).forEach((key) => {
      if (typeof key === "string" && key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase();
        const e = eventMap.get(eventName);
        if (e) {
          dom.removeEventListener(eventName, e);
          eventMap.delete(eventName);
        }
      } else if (typeof key === "string" && dom instanceof HTMLElement) {
        dom.removeAttribute(key);
      }
    });
  }

  // 设置类名
  if (dom instanceof HTMLElement) {
    if (_class) {
      dom.className = `${className || ""} ${parseClass(_class)}`.trim();
    } else if (className) {
      dom.className = className;
    }
  }

  // 设置样式
  if (style && dom instanceof HTMLElement) {
    dom.style.cssText = parseStyle(style);
  }

  // 绑定新事件并更新事件映射表
  Reflect.ownKeys(props)
    .filter((key): key is string => typeof key === "string" && key.startsWith("on"))
    .forEach((key: string) => {
      const event = Reflect.get(props, key) as EventListener;
      const eventName = key.slice(2).toLowerCase();
      dom.addEventListener(eventName, event);
      eventMap.set(eventName, event);
    });

  // 应用其他属性（非事件）
  const remainingProps: Record<string, unknown> = {};
  Reflect.ownKeys(props)
    .filter((key) => typeof key === "string" && !key.startsWith("on"))
    .forEach((key) => {
      remainingProps[key as string] = Reflect.get(props, key);
    });

  Object.assign(dom as HTMLElement, remainingProps);

  // 处理 ref
  if ($ref) {
    const refs = [$ref]
      .flat()
      .filter(
        (ref): ref is IRef<DOMElement> =>
          ref !== undefined && ref !== null && typeof ref === "object" && "set" in ref,
      );
    refs.forEach((ref) => {
      ref.set(dom);
    });
  }
}

const wipRoot: { current: Fiber | null } = { current: null };
const currentRoot: { current: Fiber | null } = { current: null };
const deletions: Fiber[] = [];
let nextUnitOfWork: Fiber | null = null;

/** 排队渲染队列，在渲染进行中时暂存后续更新请求 */
const pendingRenderQueue: Array<{ element: Msom.MsomElement; container: HTMLElement }> = [];

/**
 * 安全地调度渲染，若有正在进行的渲染则排队等待
 */
function scheduleRender(element: Msom.MsomElement, container: HTMLElement) {
  if (wipRoot.current !== null) {
    pendingRenderQueue.push({ element, container });
    return;
  }
  performRender(element, container);
}

function flushPendingRender() {
  while (pendingRenderQueue.length > 0) {
    const { element, container } = pendingRenderQueue.shift()!;
    performRender(element, container);
  }
}

function performRender(element: Msom.MsomElement, container: HTMLElement) {
  deletions.length = 0;
  wipRoot.current = {
    parent: null,
    dom: container,
    props: { children: [element] as any },
    alternate: currentRoot.current,
    type: null,
    effectTag: null,
    child: null,
    sibling: null,
    component: null,
    rootFiber: null,
    renderedVNode: null,
  };
  nextUnitOfWork = wipRoot.current;
  requestIdleCallback(workLoop);
}

export function render(
  element: Msom.MsomElement,
  container: HTMLElement,
) {
  performRender(element, container);
}

function createFiber(element: Msom.MsomElement, fiber: Fiber): Fiber {
  return {
    type: element.type as FiberType,
    props: element.props as VNodeProps,
    parent: fiber,
    dom: null,
    sibling: null,
    child: null,
    effectTag: "PLACEMENT",
    alternate: null,
    component: null,
    rootFiber: null,
    renderedVNode: null,
  };
}

function normalizeKey(key: string | number | bigint | undefined | null, fallback: number): string | number {
  if (key === undefined || key === null) return fallback;
  if (typeof key === "bigint") return key.toString();
  return key;
}

function reconcileChildren(fiber: Fiber, elements?: Msom.MsomElement<any>[]) {
  if (!elements) {
    return;
  }
  let index = 0;
  let prevSibling: Fiber | null = null;
  let oldFiber = fiber.alternate && fiber.alternate.child;

  // 构建旧fiber的key映射，用于高效查找
  // 使用独立计数器，避免复用 while 循环中的 index（此时 index 始终为 0）
  const oldFiberMap = new Map<string | number, Fiber>();
  let oldIndex = 0;
  let tempOldFiber = oldFiber;
  while (tempOldFiber) {
    const key = normalizeKey(tempOldFiber.props?.$key, oldIndex);
    oldFiberMap.set(key, tempOldFiber);
    oldIndex++;
    tempOldFiber = tempOldFiber.sibling;
  }

  // 只遍历新元素，未匹配的旧 fiber 由循环后的清理逻辑处理
  while (index < elements.length) {
    const element = elements[index];
    const key = normalizeKey(element?.props?.$key, index);
    const oldFiberByKey = oldFiberMap.get(key);
    const sameType = oldFiberByKey && element && oldFiberByKey.type === element.type;
    let newFiber: Fiber | null = null;

    if (sameType && element) {
      // 类型和key都相同，复用旧fiber
      assert(oldFiberByKey);
      newFiber = {
        type: oldFiberByKey.type,
        child: null,
        sibling: null,
        props: element.props as VNodeProps,
        parent: fiber,
        dom: oldFiberByKey.dom,
        alternate: oldFiberByKey,
        effectTag: "UPDATE",
        component: oldFiberByKey.component,
        rootFiber: null,
        renderedVNode: null,
      };
      oldFiberMap.delete(key);
    } else if (element) {
      // 类型不同或无匹配旧fiber，创建新fiber
      newFiber = createFiber(element, fiber);
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }

  // 清理未匹配到的旧fiber，标记为删除
  oldFiberMap.forEach((orphanFiber) => {
    orphanFiber.effectTag = "DELETION";
    deletions.push(orphanFiber);
  });
}

interface FiberSnapshot {
  props: VNodeProps;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
  dom: DOMElement | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  component: IComponent | null;
  renderedVNode: Msom.MsomElement | null;
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
        dom: fiber.dom,
        child: fiber.child,
        sibling: fiber.sibling,
        parent: fiber.parent,
        component: fiber.component,
        renderedVNode: fiber.renderedVNode,
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
      fiber.child = snapshot.child;
      fiber.sibling = snapshot.sibling;
      fiber.parent = snapshot.parent;
      fiber.component = snapshot.component;
      fiber.renderedVNode = snapshot.renderedVNode;
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
  
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    const fiber = nextUnitOfWork;
    fiberTransaction.snapshot(fiber);
    
    try {
      const _nextUnitOfWork = performUnitOfWork(fiber);
      nextUnitOfWork = _nextUnitOfWork;
    } catch (error) {
      console.error('Fiber processing error:', error);
      fiberTransaction.rollback();
      throw error;
    }
  }
  
  if (!nextUnitOfWork && wipRoot.current) {
    try {
      commitRoot();
      fiberTransaction.commit();
      // 刷新排队的渲染请求
      flushPendingRender();
    } catch (error) {
      console.error('Commit error:', error);
      fiberTransaction.rollback();
      throw error;
    }
  }
  
  // 仅当还有待处理工作时才继续调度，避免无限空转
  if (nextUnitOfWork || wipRoot.current) {
    requestIdleCallback(workLoop);
  }
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
        // 通过静态方法触发错误状态更新
        const errorBoundary = parent.component as any;
        if (typeof errorBoundary.constructor.getDerivedStateFromError === 'function') {
          const stateUpdate = errorBoundary.constructor.getDerivedStateFromError(
            error instanceof Error ? error : new Error(String(error))
          );
          Object.assign(errorBoundary, { state: { hasError: true, ...stateUpdate } });
        }
        if (typeof errorBoundary.componentDidCatch === 'function') {
          errorBoundary.componentDidCatch(
            error instanceof Error ? error : new Error(String(error)),
            { componentStack: '' }
          );
        }
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
        if (typeof propKey === "string" && Reflect.has(props, propKey)) {
          newProps[propKey] = props[propKey];
        }
      }
    }

    // 获取或创建组件实例
    let isNewComponent = false;
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
      isNewComponent = true;
      const ComponentType = fiber.type as new (props: VNodeProps) => IComponent;
      const component = new ComponentType(newProps);
      // 生命周期: created
      component.created();
      return component;
    })();

    // 存储组件实例到fiber
    fiber.component = component;

    // 处理传递的子元素
    const childrenArray = [children].flat().filter((c) => c !== undefined && c !== null);
    const processChildren = (items: Msom.MsomNode[]) => {
      return items.map((c) => {
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
    if (childrenArray.length > 0) {
      if (isArray(childrenArray)) {
        const c = processChildren(childrenArray as Msom.MsomNode[]);
        component.setJSX(c);
      } else {
        component.setJSX(processChildren([childrenArray])[0]);
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
          const handler = on as Parameters<Event<any>["on"]>[1];
          c.on(newEK, handler);
          binding[newEK] = () => c.un(newEK, handler);
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
    // 生命周期: setup（仅新组件调用，复用组件跳过以免重复初始化）
    if (isNewComponent) {
      component.setup();
    }
    //
    fiber.dom = fiber.parent?.dom || null;
    const processRender = (v: Msom.MsomNode) => {
      assert(fiber.dom);
      if (v === undefined || v === null || v === false) {
        return;
      }
      if (isPromiseLike<any, any>(v)) {
        v.then((res) => processRender(res));
      } else if (isArray(v) || isIterator(v)) {
        for (v of v) {
          processRender(v);
        }
      } else if (isTextElement(v)) {
        scheduleRender(
          createTextElement(v.toString()),
          fiber.dom as HTMLElement,
        );
      } else {
        scheduleRender(v, fiber.dom as HTMLElement);
      }
    };
    // 渲染组件内容
    const updateHandle = () => {
      let newVNode = component.render();
      if (newVNode) {
        // 在组件自己的容器内重建：先清空容器，再以 alternate: null 渲染新树。
        // 不沿用全局 currentRoot 作为 alternate，避免整树比对把父节点误判为 DELETION 而清空整页。
        const container = fiber.dom as HTMLElement;
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          deletions.length = 0;
          wipRoot.current = {
            parent: null,
            dom: container,
            props: { children: [newVNode] as any },
            alternate: null,
            type: null,
            effectTag: null,
            child: null,
            sibling: null,
            component: null,
            rootFiber: null,
            renderedVNode: null,
          };
          nextUnitOfWork = wipRoot.current;
          requestIdleCallback(workLoop);
        }
      }
    };
    // 首次渲染链接已经存在的工作根
    let ne: any = null;
    // 清理旧 reaction，避免多次 createReaction 累积导致重复渲染
    const oldDisposer = (component as any)[reactionDisposerKey];
    if (oldDisposer) {
      oldDisposer();
    }
    // 注册组件内部更新回调
    const newReaction = createReaction(
      () => {
        ne = component.render();
        // 存储渲染结果到 fiber，commit 阶段直接复用，避免建立响应式依赖
        fiber.renderedVNode = ne;
      },
      updateHandle, // 后续更新将从该组件开始更新
      { scheduler: "nextTick" },
    );
    (component as any)[reactionDisposerKey] = newReaction.disposer();
    component.onunmounted((component as any)[reactionDisposerKey]);
    // 处理不同类型的子元素
    const processRender2 = (v: Msom.MsomNode) => {
      assert(fiber.dom);
      if (v === undefined || v === null || v === false) {
        return;
      }
      if (isPromiseLike<any, any>(v)) {
        // 处理Promise-like对象
        processRender(v);
      } else if (isArray(v) || isIterator(v)) {
        for (v of v) {
          processRender2(v);
        }
      } else if (isTextElement(v)) {
        fiber.props.children = createTextElement(v.toString()) as any;
      } else {
        fiber.props.children = v as any;
      }
    };
    // 首次渲染链接到当前工作根
    processRender2(ne);
  } else if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // 将文本子节点（字符串/数字）归一化为文本元素，避免 reconcileChildren 创建 type: undefined 的 fiber
  // flat(Infinity) 深度展开嵌套数组（如 JSX 表达式 {list.map(...)} 产生的空数组），避免空数组被当作元素
  const rawElements = [fiber.props.children].flat(Infinity);
  const elements = rawElements.map((el: any) => {
    if (typeof el === 'string' || typeof el === 'number') {
      return createTextElement(el.toString());
    }
    return el;
  }).filter(Boolean);
  reconcileChildren(fiber, elements as Msom.MsomElement<any>[]);
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

/**
 * 递归卸载 Fiber 子树中的所有组件，触发 unmount 生命周期
 */
function unmountFiberTree(fiber: Fiber) {
  if (fiber.component) {
    fiber.component.unmount();
    setComponentVNode(fiber.component, null);
  }
  let child = fiber.child;
  while (child) {
    unmountFiberTree(child);
    child = child.sibling;
  }
}

function commitRoot() {
  const wip = wipRoot.current!;
  deletions.forEach(commitWork);
  commitWork(wip.child);
  currentRoot.current = wip;
  wipRoot.current = null;
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
    // 复用渲染阶段的结果，避免在 commit 阶段重新调用 render() 建立响应式依赖
    const newVNode = fiber.renderedVNode;

    if (fiber.effectTag === "UPDATE" && oldVNode && newVNode) {
      const container = domParent as HTMLElement;
      const oldDom = component.el;

      if (wasMounted && oldDom && (newVNode as any).type === oldVNode.type) {
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
      // 卸载组件 - 递归清理子组件生命周期
      unmountFiberTree(fiber);
      // 移除DOM
      const container = domParent as HTMLElement;
      const componentDom = component.el;
      if (componentDom && container.contains(componentDom)) {
        container.removeChild(componentDom);
      }
      setComponentVNode(component, null);
    }

    // 组件的子 Fiber 在 render 阶段由 createDom 创建的 DOM 是"幽灵 DOM"，
    // 实际 DOM 由 renderComponentVNode 管理，与 Fiber 树的 DOM 引用不一致。
    // 因此跳过所有组件 Fiber 的子节点递归，避免操作错误 DOM 或 assert 失败。
    commitWork(fiber.sibling);
    return;
  }

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
                return target;
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
      const refs: IRef<any>[] = [$ref].flat().filter((r) => r && typeof r === "object" && "set" in r);
      refs.forEach((ref) => ref.set(dom));
    }

    // 递归处理children
    const childrenArray = [children].flat().filter((c) => c !== undefined && c !== null);
    if (childrenArray.length > 0) {
      childrenArray.forEach((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          renderComponentVNode(child as Msom.MsomElement, dom, component);
        } else if (typeof child === "string" || typeof child === "number") {
          const textNode = document.createTextNode(String(child));
          dom.appendChild(textNode);
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
      const nestedComponent = new (vnode.type as new (
        ...args: unknown[]
      ) => IComponent)(vnode.props) as IComponent;
      nestedComponent.created();
      nestedComponent.setup();
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

      // 注册响应式 reaction，使嵌套组件在状态变化时能自动更新
      const updateNestedComponent = () => {
        const newNestedVNode = nestedComponent.render();
        if (newNestedVNode) {
          const oldDom = nestedComponent.el;
          if (oldDom && oldDom.parentElement) {
            const parent = oldDom.parentElement;
            parent.removeChild(oldDom);
            const tempContainer = document.createDocumentFragment();
            renderComponentVNode(
              newNestedVNode as Msom.MsomElement,
              tempContainer,
              nestedComponent,
            );
            while (tempContainer.firstChild) {
              parent.appendChild(tempContainer.firstChild);
            }
          }
        }
        nestedComponent.rendered();
      };
      nestedComponent.onunmounted(
        createReaction(
          () => {
            nestedComponent.render();
          },
          updateNestedComponent,
          { scheduler: "nextTick" },
        ).disposer(),
      );
    }
  }
}

/**
 * 递归更新子节点列表
 */
function updateChildrenInPlace(
  dom: HTMLElement,
  oldChildren: Msom.MsomNode[],
  newChildren: Msom.MsomNode[],
): void {
  const maxLen = Math.max(oldChildren.length, newChildren.length);
  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];

    if (oldChild === newChild) continue;

    // 新节点不存在 → 删除旧节点
    if (newChild == null) {
      if (oldChild != null && dom.childNodes[i]) {
        dom.removeChild(dom.childNodes[i]);
      }
      continue;
    }

    // 旧节点不存在 → 添加新节点
    if (oldChild == null) {
      appendChildToDom(dom, newChild);
      continue;
    }

    // 两者都是文本节点 → 更新文本内容
    const isOldText = typeof oldChild === 'string' || typeof oldChild === 'number' || typeof oldChild === 'bigint' || oldChild === true;
    const isNewText = typeof newChild === 'string' || typeof newChild === 'number' || typeof newChild === 'bigint' || newChild === true;

    if (isOldText && isNewText) {
      const textNode = dom.childNodes[i];
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        (textNode as Text).nodeValue = String(newChild);
      } else {
        // 替换为文本节点
        if (textNode) dom.removeChild(textNode);
        dom.insertBefore(document.createTextNode(String(newChild)), dom.childNodes[i] || null);
      }
      continue;
    }

    // 文本节点 → 元素节点（或反之）：替换
    if (isOldText !== isNewText) {
      const oldNode = dom.childNodes[i];
      if (oldNode) dom.removeChild(oldNode);
      appendChildToDom(dom, newChild);
      continue;
    }

    // 两者都是 VNode 元素
    const oldVNode = oldChild as Msom.MsomElement;
    const newVNode = newChild as Msom.MsomElement;

    if (oldVNode.type === newVNode.type) {
      // 类型相同 → 递归更新
      const existingDom = dom.childNodes[i] as HTMLElement;
      if (existingDom) {
        updateVNodeInPlace(existingDom, oldVNode as VNode, newVNode);
      }
    } else {
      // 类型不同 → 替换
      const oldNode = dom.childNodes[i];
      if (oldNode) dom.removeChild(oldNode);
      appendChildToDom(dom, newChild);
    }
  }
}

/**
 * 将 VNode 作为子节点追加到 DOM 元素
 */
function appendChildToDom(parent: HTMLElement, child: Msom.MsomNode): void {
  if (child == null) return;
  if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint' || child === true) {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }
  const vnode = child as Msom.MsomElement;
  if (vnode.type === TEXT_NODE) {
    parent.appendChild(document.createTextNode(String((vnode.props as any)?.nodeValue || '')));
    return;
  }
  if (typeof vnode.type === 'string') {
    const el = document.createElement(vnode.type);
    const { children, ...props } = vnode.props;
    // 应用属性
    Object.entries(props).forEach(([key, val]) => {
      if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
      } else if (key === 'className') {
        el.className = String(val);
      } else if (key === 'class') {
        el.className = parseClass(val);
      } else if (key === 'style') {
        el.style.cssText = parseStyle(val);
      } else {
        (el as any)[key] = val;
      }
    });
    // 递归处理children
    if (children) {
      const childArr = [children].flat().filter(c => c != null);
      childArr.forEach(c => appendChildToDom(el, c));
    }
    parent.appendChild(el);
  }
}

function updateVNodeInPlace(
  dom: HTMLElement,
  oldVNode: VNode,
  newVNode: Msom.MsomElement
): void {
  if (!oldVNode || !newVNode) return;
  
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  const { children: _newChildren, class: _class, style, $key: _key, $ref: _ref, ...newRestProps } = newProps;
  const { children: _oldChildren, class: _oldClass, style: _oldStyle, $key: _oldKey, $ref: _oldRef, ...oldRestProps } = oldProps;
  
  // 处理 class
  if (_class) {
    dom.className = parseClass(_class);
  }
  
  // 处理 style
  if (style) {
    dom.style.cssText = parseStyle(style);
  }
  
  // 处理事件变更：移除旧事件，绑定新事件
  const oldEventKeys = Object.keys(oldRestProps).filter(k => k.startsWith("on"));
  const newEventKeys = Object.keys(newRestProps).filter(k => k.startsWith("on"));
  const allEventKeys = new Set([...oldEventKeys, ...newEventKeys]);
  
  allEventKeys.forEach((key) => {
    const oldHandler = (oldRestProps as any)[key] as EventListener | undefined;
    const newHandler = (newRestProps as any)[key] as EventListener | undefined;
    const eventName = key.slice(2).toLowerCase();
    
    if (oldHandler && oldHandler !== newHandler) {
      dom.removeEventListener(eventName, oldHandler);
    }
    if (newHandler && oldHandler !== newHandler) {
      dom.addEventListener(eventName, newHandler);
    }
  });
  
  // 应用非事件属性
  const finalProps: Record<string, unknown> = {};
  Object.keys(newRestProps).forEach((key) => {
    if (!key.startsWith("on")) {
      finalProps[key] = (newRestProps as any)[key];
    }
  });
  Object.assign(dom, finalProps);

  // 递归处理子节点 diff
  const oldChildArr = [(_oldChildren as Msom.MsomNode[] || [])].flat().filter(c => c != null);
  const newChildArr = [(_newChildren as Msom.MsomNode[] || [])].flat().filter(c => c != null);
  updateChildrenInPlace(dom, oldChildArr, newChildArr);
}

/**
 * 兼容API：通过回调函数挂载元素到容器
 * @param mount 返回要挂载的元素的函数
 * @param container 父容器元素
 */
export function mountWith(
  mount: () => Msom.MsomElement | void,
  container: Element,
) {
  const element = mount();
  if (element) {
    render(element, container as HTMLElement);
  }
}

/**
 * 兼容API：挂载组件实例到容器
 * @param component 组件实例
 * @param container 父容器元素
 */
export function mountComponent(component: IComponent, container: Element) {
  const element = component.mount();
  if (element) {
    render(element as Msom.MsomElement, container as HTMLElement);
  }
}

if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
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
