import {
  Event,
  Nullable,
  assert,
  compareObjects,
  getComponentDefinition,
  getGlobalData,
  isComponent,
  isPromiseLike,
  ownKeysAndPrototypeOwnKeys,
  parseClass,
  parseStyle,
  setGlobalData,
} from "@msom/common";
import { IComponent, IComponentProps } from "./IComponent";
import { IRef } from "./Ref";
import { createReaction, withoutTrack } from "@msom/reaction";

type $DOM = {
  rendering?: IComponent;
};

setGlobalData("@msom/dom", {} as $DOM);

const componentVDOMMap = new WeakMap<IComponent, Msom.MsomNode | Nullable>();

export const TEXT_NODE = "TEXT_NODE";

export function createElement<T extends Msom.JSX.ElementType>(
  type: T,
  config: Omit<Msom.H<T>, "children"> | null | undefined,
  ...children: Msom.MsomElement<any>[]
): Msom.MsomElement {
  config = config || {};
  const _config = {
    ...config,
    children: children.map((v: any) =>
      v && typeof v === "object" ? v : createTextElement(v)
    ),
  };
  return {
    type,
    props: _config,
  };
}

function createTextElement(text: string): Msom.MsomElement {
  return {
    type: TEXT_NODE,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
function createDom<
  T extends
    | string
    | keyof Msom.JSX.IntrinsicElements
    | Msom.JSXElementConstructor<unknown>
>(element: Msom.MsomElement<T>) {
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
  // 给元素赋属性值
  // 处理class
  if (_class) {
    props.className = `${parseClass(_class)} ${props.className || ""}`.trim();
  }
  // 处理style
  if (style) {
    Object.assign(props, { style: parseStyle(style) });
  }
  // 处理事件
  Reflect.ownKeys(props)
    .filter((key) => typeof key === "string" && key.startsWith("on"))
    .forEach((key: string) => {
      const event = Reflect.get(props, key, props);
      Reflect.deleteProperty(props, key);
      dom.addEventListener(
        key.slice(2).toLowerCase(),
        function (this: typeof dom, e) {
          const _e = new Proxy(e, {
            get: (taget, prop, receiver) => {
              const value = Reflect.get(taget, prop, receiver);
              return typeof value === "function" ? value.bind(taget) : value;
            },
            set: Reflect.set,
          });
          event.bind(this)(_e);
        }
      );
    });

  Object.assign(dom, props);
  return dom;
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

    // lifeCircle: create
    const component = (() => {
      let component = componentCache.get(_props.$key);
      if (!component) {
        component = new element.type(_props) as IComponent;
        _props.$key != undefined && componentCache.set(_props.$key, component);
      } else {
        component.set(_props as IComponentProps);
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
    // lifeCircle: created
    component.created();
    // 挂载组件
    const domGlobalData = getGlobalData("@msom/dom") as $DOM;
    const { rendering } = domGlobalData;
    component.$owner = rendering;
    component.onunmounted(
      createReaction(
        () => {
          const prevVDOM = componentVDOMMap.get(component);
          const mounted = component.isMounted();
          if (component.el) {
            container.removeChild(component.el);
          }
          const vDOM = component.mount() || undefined;
          componentVDOMMap.set(component, vDOM);
          const isChanged = patchVDOM(vDOM, prevVDOM);
          const dom = renderer(vDOM, container);
          component.rendered();
          if (!isChanged) {
            return;
          }
          component.el = dom as HTMLElement;
          if (dom) {
            // 将类组件实例附着在dom上
            // TODO: 生产环境禁用
            if (!Reflect.get(dom, "$owner")) {
              Object.assign(dom, { $owner: component });
            }
            container.appendChild(dom);
            if (!mounted) {
              component.mounted();
            }
          }
        },
        {
          scheduler: "nextFrame",
          // scheduler: (cb) => {
          //   requestIdleCallback(({ timeRemaining }) => {
          //     timeRemaining() > 0 && cb();
          //   });
          // },
        }
      ).disposer()
    );
  });
}

function isValidChild(
  child: Msom.MsomElement<any> | Msom.MsomElement<any>[] | Nullable
): boolean {
  if (!child) {
    return false;
  }
  child = [child].flat();
  return child.length > 0;
}

function renderer(
  element: Msom.MsomNode | undefined | null,
  container: Element
): HTMLElement | Text | undefined {
  if (!element) {
    return;
  }
  if (typeof element !== "object") {
    element = createTextElement(String(element));
  }
  if (isPromiseLike(element)) {
    element.then((e) => {
      renderer(e, container);
    });
    return;
  }
  if (element[Symbol.iterator]) {
    for (const e of element as Iterable<Msom.MsomNode>) {
      renderer(e, container);
    }
    return;
  }
  const _element = element as Exclude<typeof element, Iterable<any>>;
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
    const dom: HTMLElement | Text = createDom(_element);
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
  container: Element
) {
  const element = mount();
  element && renderer(element, container);
}
export function mountComponent(component: IComponent, container: Element) {
  const element = component.mount();
  element && renderer(element, container);
}

/**
 *
 * @param vDOM
 * @param prevVDOM
 * @returns 返回时否有变
 */
function patchVDOM(
  vDOM: Msom.MsomNode | Nullable,
  prevVDOM: Msom.MsomNode | Nullable
) {
  if (!prevVDOM) {
    return true;
  } else {
    if (vDOM === null || prevVDOM === null) {
      return Object.is(vDOM, prevVDOM);
    } else if (typeof vDOM === "object" && typeof prevVDOM === "object") {
      return compareObjects(vDOM, prevVDOM);
    } else {
      return Object.is(vDOM, prevVDOM);
    }
  }
}

Object.assign(globalThis, {
  Msom: { createElement },
});
