export declare const TEXT_NODE = "TEXT_NODE";
/**
 * 判断值是否为可迭代对象
 */
export declare function isIterator<T extends unknown = unknown>(v: unknown): v is Iterable<T>;
/**
 * 创建 JSX 元素
 */
export declare function createElement<T extends Msom.JSX.ElementType>(type: T, config: Omit<Msom.H<T>, "children"> | null | undefined, ...children: Msom.MsomNode[]): Msom.MsomElement;
/**
 * 创建文本元素
 */
export declare function createTextElement(text: string | Function): Msom.MsomElement;
/**
 * 判断值是否为文本类型元素（字符串、数字、bigint、true、函数）
 */
export declare function isTextElement(v: Msom.MsomNode): v is Function | string | number | bigint | true;
