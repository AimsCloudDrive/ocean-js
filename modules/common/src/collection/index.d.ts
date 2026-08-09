import { Nullable, createFunction } from '../global';
export declare class AnyMap<V = any> {
    private originMap;
    private objectMap;
    constructor();
    private getMap;
    get(key: unknown): V | undefined;
    set(key: unknown, value: V): this;
    has(key: unknown): boolean;
    delete(key: unknown): boolean;
    clear(): void;
}
/** 集合事件类型定义 */
export type CollectionEvent = Record<never, never>;
/** 集合键类型，可以是字符串或数字 */
export type CollectionKey = any;
/**
 * 获取集合元素键值的函数类型
 * @template T 元素类型
 */
export type CollectionGetKey<T = unknown> = (data: T) => CollectionKey;
/**
 * 数组转换接口定义
 * @template T 元素类型
 */
interface ToArray<T = unknown> {
    /**
     * 将集合转换为数组（不带映射器）
     * @param filter 可选的过滤函数
     * @param mapper 可选的映射函数（此重载中不使用）
     */
    toArray(filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>, mapper?: Nullable): T[];
    /**
     * 将集合转换为数组（带映射器）
     * @template RT 映射后的类型
     * @param filter 可选的过滤函数
     * @param mapper 可选的映射函数
     */
    toArray<RT>(filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>, mapper?: createFunction<[T, CollectionKey, this, RT]>): RT[];
}
/**
 * 集合类，提供基于键值的元素存储和管理
 * @template T 元素类型
 */
export declare class Collection<T = unknown> implements Iterable<T>, ToArray<T> {
    /** 获取元素键值的函数 */
    private getKey;
    /** 存储所有元素的数组 */
    private elements;
    /** 键值到数组索引的映射 */
    private indexMap;
    /**
     * 创建集合实例
     * @param getKey 获取元素键值的函数
     */
    constructor(getKey?: CollectionGetKey<T>);
    /**
     * 获得集合的实际元素数量
     */
    size(): number;
    /**
     *
     * @param key
     * @returns 存在返回下标，不存在返回-1
     */
    private getIndex;
    /**
     * 根据键值获取元素
     * @param key 元素的键值
     * @returns 对应的元素或undefined
     */
    get(key: CollectionKey): T;
    /**
     * 检查是否存在指定键值的元素
     * @param key 要检查的键值
     * @returns 是否存在
     */
    hasKey(key: CollectionKey): boolean;
    /**
     * 检查元素是否在集合中
     * @param element 要检查的元素
     * @returns 是否存在
     */
    hasElement(element: T): boolean;
    /**
     * 添加元素到集合
     * @param element 要添加的元素
     * @param force 当元素已存在时是否强制替换，默认为false
     */
    add(element: T, force?: boolean): void;
    /**
     * 使用指定的键值添加元素
     * @param key 指定的键值
     * @param element 要添加的元素
     * @param force 当键值已存在时是否强制替换，默认为false
     */
    addKey(key: CollectionKey, element: T, force?: boolean): void;
    /**
     * 批量添加元素
     * @param iterator 可迭代的元素集合
     * @param force 当元素已存在时是否强制替换，默认为false
     */
    addAll(iterator: Iterable<T>, force?: boolean): void;
    /**
     * 在指定位置插入元素
     * @param element 待插入的元素
     * @param index 插入位置，范围[0, length]。如果超出范围会被自动调整到有效范围内
     * @param force 当元素已存在时的处理选项
     * @param exist.index 是否保持原有元素的位置。true: 保持原位置，false: 使用新位置
     * @param exist.element 是否使用新元素替换原有元素。true: 使用新元素，false: 保持原有元素
     *
     * eg.1 insert(xxx, 1, { newIndex: true, newElement: true }) -> 在新位置插入新元素，删除旧位置的旧元素
     * eg.2 insert(xxx, 1, { newIndex: false, newElement: false }) -> 无变化
     * eg.3 insert(xxx, 1, { newIndex: true, newElement: false }) -> 将旧元素移动到新位置
     * eg.4 insert(xxx, 1, { newIndex: false, newElement: true }) -> 在旧位置替换新元素
     * eg.5 insert(xxx, 1, false) -> 无变化
     * eg.6 insert(xxx, 1, true) -> eg.1
     */
    insert(element: T, index: number, force?: {
        newIndex?: boolean;
        newElement?: boolean;
    } | boolean): void;
    /**
     * 移除指定元素
     * @param element 要移除的元素
     * @returns 是否成功移除
     */
    removeElement(element: T): boolean;
    /**
     * 根据键值移除元素
     * @param key 要移除的元素的键值
     * @returns 被移除的元素，如果元素不存在则返回undefined
     */
    remove(key: CollectionKey): T | undefined;
    /**
     * 清空集合中的所有元素
     */
    clear(): void;
    /**
     * 更新索引映射
     * 当元素数组发生变化时，需要重新计算每个元素的索引
     * @private
     */
    private updateIndexMap;
    /**
     * 实现Iterable接口，使集合可以被迭代
     * 使用生成器函数遍历集合中的所有元素
     * @yields 集合中的每个元素
     */
    [Symbol.iterator](): Iterator<T, T, undefined>;
    /**
     * 遍历集合中的所有元素
     * @param handler 处理每个元素的回调函数，(element, key, index, this): void
     */
    each(handler: createFunction<[T, CollectionKey, number, this, void]>): void;
    toArray<RT = T>(filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>, mapper?: Nullable | createFunction<[T, CollectionKey, this, RT]>): RT[];
}
export {};
