import { assert, parseClass, parseStyle } from "@msom/common";
import { Observer } from "@msom/reaction";
import { TEXT_NODE } from "./element";

interface Fiber {
  type?: keyof Msom.JSX.ElementTypeMap | null;
  dom: HTMLElement | Text | null;
  props: Msom.H<any>;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
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

export function render(element: Msom.MsomElement<any>, container: HTMLElement) {
  deletions.set([]);
  wipRoot.set({
    parent: null,
    dom: container,
    props: { children: [element as any] },
    alternate: currentRoot.get(),
    type: null,
    effectTag: null,
    child: null,
    sibling: null,
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
  if (!fiber.dom) {
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

Object.assign(window, {
  bbbb: {
    wipRoot,
    currentRoot,
    deletions,
    nextUnitOfWork,
    commitRoot,
  },
});
