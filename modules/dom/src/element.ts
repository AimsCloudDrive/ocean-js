import {
  CSSStyle,
  ClassType,
  Event,
  Nullable,
  compareObjects,
  getGlobalData,
  ownKeysAndPrototypeOwnKeys,
  parseClass,
  parseStyle,
  performChunk,
  setGlobalData,
} from "@ocean/common";
import {
  Component,
  IRef,
  initComponentDefinition,
  isComponent,
} from "@ocean/component";
import { createReaction, withoutTrack } from "@ocean/reaction";

type $DOM = {
  rendering?: Component;
};

setGlobalData("@ocean/dom", {} as $DOM);

const componentVDOMMap = new WeakMap<Component, DOMElement<any>>();

declare global {
  export namespace Component {
    export interface Context {}
  }
}

export const TEXT_NODE = "TEXT_NODE";

export type DOMElement<T> = {
  type: T;
  props: Omit<React.HTMLAttributes<T>, "style" | "children"> & {
    $ref?: IRef<any> | IRef<any>[];
    $key?: string | number;
    style?: CSSStyle;
    class?: ClassType;
    nodeValue?: string;
    context?: Partial<Component.Context>;
  } & {
    children: DOMElement<any>[];
  };
};

export function createElement(
  type: keyof HTMLElementTagNameMap | string,
  config: {} | null,
  ...children: DOMElement<any>[]
) {
  return {
    type,
    props: {
      ...(config || {}),
      children: children.map((v: any) =>
        v && typeof v === "object" ? v : createTextElement(v)
      ),
    },
  };
}

function createTextElement(text: string) {
  return {
    type: TEXT_NODE,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDom<T = any>(element: DOMElement<T>) {
  const {
    children,
    class: _class,
    style,
    $key,
    $ref,
    context,
    ...props
  } = element.props;
  // 创建元素
  const dom =
    element.type === TEXT_NODE
      ? document.createTextNode("")
      : document.createElement(element.type as string);
  // 给元素赋属性值
  // 处理class
  if (_class) {
    props.className = `${parseClass(_class)} ${props.className || ""}`.trim();
  }
  // 处理style
  if (style) {
    Object.assign(props, { style: parseStyle(style) });
  }

  Object.assign(dom, props);
  return dom;
}

const eventBindingMap = new WeakMap<
  WeakKey,
  { [K in PropertyKey]: Parameters<Event["on"]>[1] }
>();

export function renderClassComponent(
  element: DOMElement<any>,
  container: HTMLElement
) {
  withoutTrack(() => {
    const { children, $ref, ...props } = element.props;
    const componentDefinition = initComponentDefinition(element.type.prototype);

    // 处理自定义事件
    // 组件声明的事件
    const { $events } = componentDefinition;
    const $eventKeys = ownKeysAndPrototypeOwnKeys($events);
    const { ..._props } = props;
    // 去除props中的自带属性
    delete _props["__self"];
    delete _props["__source"];
    // 去除props中的事件
    if ($eventKeys.size()) {
      for (const eventKey of $eventKeys) {
        if (Reflect.has(_props, eventKey)) {
          delete _props[eventKey];
        }
      }
    }

    // 类组件
    const inst: Component<any, any> = new element.type(_props);
    // 处理传递的子元素
    if (children && children.length > 0) {
      const c = children.map((c) => {
        if (c.type === TEXT_NODE && typeof c.props.nodeValue === "function") {
          return c.props.nodeValue;
        } else {
          return c;
        }
      });
      inst.setJSX(c.length > 1 ? c : c[0]);
    }
    // 处理ref
    if ($ref) {
      const _$ref = [$ref].flat();
      for (const ref of _$ref) {
        ref.set(inst);
      }
    }

    // 事件绑定
    if ($eventKeys.size()) {
      const binding = eventBindingMap.get(inst) || {};
      eventBindingMap.set(inst, binding);
      for (const key of $eventKeys) {
        // 清除上次注册的事件
        inst.un(key, binding[key]);
        Reflect.deleteProperty(binding, key);
        // 绑定新事件
        const on = props[key];
        if (on && typeof on === "function") {
          inst.on(key, on);
          Object.assign(binding, { [key]: { on } });
        }
      }
    }
    // 挂载组件
    const domGlobalData = getGlobalData("@ocean/dom") as $DOM;
    const { rendering } = domGlobalData;
    inst.$owner = rendering;
    domGlobalData.rendering = inst;
    try {
      inst.onunmounted(
        createReaction(
          () => {
            const prevVDOM = componentVDOMMap.get(inst);
            const vDOM = inst.render();
            const isChanged = patchVDOM(vDOM, prevVDOM);
            componentVDOMMap.set(inst, vDOM);
            const dom = renderer(vDOM, container);
            inst.rendered();
            if (!isChanged) {
              return;
            }
            const mounted = inst.isMounted();
            if (inst.el) {
              container.removeChild(inst.el);
            }
            inst.el = dom as HTMLElement;
            if (dom) {
              // 将类组件实例附着在dom上
              // TODO: 生产环境禁用
              if (!Reflect.get(dom, "$owner")) {
                Object.assign(dom, { $owner: inst });
              }
              container.appendChild(dom);
              if (!mounted) {
                inst.mounted();
              }
            }
          },
          {
            scheduler: "nextTick",
          }
        ).disposer()
      );
    } finally {
      Object.assign(domGlobalData, { rendering });
    }
  });
}

export function renderFunctionComponent(
  element: DOMElement<any>,
  container: HTMLElement
) {
  let dom: any = undefined;
  const { children, $ref } = element.props;
  let _children: any = undefined;
  if (children && children.length > 0) {
    _children = children.map((c) => {
      if (c.type === TEXT_NODE && typeof c.props.nodeValue === "function") {
        return c.props.nodeValue;
      } else {
        return c;
      }
    });
  }
  createReaction(() => {
    const returnElement = element.type(element.props, _children);
    withoutTrack(() => {
      const _dom = renderer(returnElement, container);
      if (dom) {
        container.removeChild(dom);
      }
      dom = _dom;
      dom && container.appendChild(dom);
      // 函数组件ref绑定生成的元素
      if ($ref) {
        const refs: IRef<any>[] = [$ref].flat();
        refs.forEach((ref) => ref.set(dom));
      }
    });
  });
}

function renderer(
  element: any,
  container: HTMLElement
): HTMLElement | Text | undefined {
  const _element = element as DOMElement<any>;
  const { children, $ref } = _element.props;
  if (typeof _element.type === "function") {
    if (isComponent(_element.type)) {
      // 类组件
      renderClassComponent(_element, container);
    } else {
      // TODO: 函数组件
      // renderFunctionComponent(_element, container);
    }
  } else {
    // 普通元素
    const dom: HTMLElement | Text = createDom(_element);
    // 普通元素ref绑定生成的元素
    if ($ref) {
      const refs: IRef<any>[] = [$ref].flat();
      refs.forEach((ref) => ref.set(dom));
    }
    // children
    if (children && children.length > 0) {
      children.forEach((child) => {
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

export { renderer as render };

/**
 *
 * @param vDOM
 * @param prevVDOM
 * @returns 返回时否有变
 */
function patchVDOM(
  vDOM: DOMElement<any>,
  prevVDOM: DOMElement<any> | Nullable
) {
  if (!prevVDOM) {
    return true;
  } else {
    return compareObjects(vDOM, prevVDOM);
  }
}
