import { setGlobalData } from "@msom/common";

type $DOM = {
  rendering?: import("./IComponent").IComponent;
};

setGlobalData("@msom/dom", {} as $DOM);

export const TEXT_NODE = "TEXT_NODE";

/**
 * 判断值是否为可迭代对象
 */
export function isIterator<T extends unknown = unknown>(
  v: unknown,
): v is Iterable<T> {
  if ((typeof v === "object" && v !== null) || typeof v === "function") {
    return Reflect.has(v, Symbol.iterator);
  } else {
    return false;
  }
}

/**
 * 创建 JSX 元素
 */
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

/**
 * 创建文本元素
 */
export function createTextElement(text: string | Function): Msom.MsomElement {
  return {
    type: TEXT_NODE,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/**
 * 判断值是否为文本类型元素（字符串、数字、bigint、true、函数）
 */
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
