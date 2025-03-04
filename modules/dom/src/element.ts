import {
  CSSStyle,
  ClassType,
  Event,
  getGlobalData,
  parseClass,
  parseStyle,
  setGlobalData,
} from "@ocean/common";
import {
  Component,
  IRef,
  getComponentDefinition,
  isComponent,
} from "@ocean/component";
import { createReaction, withoutTrack } from "@ocean/reaction";

type $DOM = {
  rendering?: Component;
};

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

export function createTextElement(text: string) {
  return {
    type: TEXT_NODE,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

type UpdateProps<T> = Omit<
  DOMElement<T>["props"],
  "children" | "class" | "style" | "context" | "$key" | "$ref"
>;
export function createDom<T = any>(element: DOMElement<T>) {
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
  { [K in string]: Parameters<Event["on"]>[1] }
>();

export function renderClassComponent(
  element: DOMElement<any>,
  container: HTMLElement
) {
  const { children, $ref, ...props } = element.props;
  const componentDefinition = getComponentDefinition(element.type.prototype);

  // 处理自定义事件
  // 组件声明的事件
  const { $events } = componentDefinition;
  const { ..._props } = props;
  // 去除props中的自带属性
  delete _props["__self"];
  delete _props["__source"];
  // 去除props中的事件
  if ($events) {
    Object.keys($events).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(_props, k)) {
        delete _props[k];
      }
    });
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
  if ($events) {
    // 清除上次注册的事件
    const binding = eventBindingMap.get(inst) || {};
    eventBindingMap.set(inst, binding);
    Object.keys($events).forEach((ek) => {
      inst.un(ek, binding[ek]);
    });

    // 绑定新事件
    Object.keys($events).forEach((k) => {
      // 绑定新事件
      const on = props[k];
      if (on && typeof on === "function") {
        inst.on(k, on);
        Object.assign(binding, { [k]: { on } });
      }
    });
  }
  // 挂载组件
  const domGlobalData = (getGlobalData("@ocean/dom") || {}) as $DOM;
  setGlobalData("@ocean/dom", domGlobalData);
  const { rendering } = domGlobalData;
  inst.$owner = rendering;
  domGlobalData.rendering = inst;
  try {
    inst.onclean(
      createReaction(
        () => {
          const instELement = inst.render();
          withoutTrack(() => {
            const dom = render(instELement, container);
            inst.rendered();
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
          });
        },
        { delay: "nextTick" }
      ).disposer()
    );
  } finally {
    Object.assign(domGlobalData, { rendering });
  }
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
      const _dom = render(returnElement, container);
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

export function render(
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
        const childDom = render(child, dom as HTMLElement);
        if (childDom) {
          dom.appendChild(childDom);
        }
      });
    }
    return dom;
  }
}
