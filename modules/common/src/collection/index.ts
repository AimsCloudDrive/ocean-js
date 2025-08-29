import { Nullable, createFunction } from "../global";
import { isObject } from "../object";
import { assert } from "../assert";
import { regressRange } from "../number";

type NotOriginType = object | Array<any> | (() => void);

export class AnyMap<V = any> {
  private originMap: Map<any, V>;
  private objectMap: WeakMap<any, V>;
  constructor() {
    this.originMap = new Map<any, V>();
    this.objectMap = new WeakMap<any, V>();
  }
  private getMap(key: unknown) {
    return isObject(key) ? this.objectMap : this.originMap;
  }
  get(key: unknown) {
    return this.getMap(key).get(key);
  }
  set(key: unknown, value: V) {
    this.getMap(key).set(key, value);
    return this;
  }
  has(key: unknown) {
    return this.getMap(key).has(key);
  }
  delete(key: unknown) {
    return this.getMap(key).has(key);
  }
  clear() {
    this.originMap.clear();
    this.objectMap = new WeakMap();
  }
}

/** 集合事件类型定义 */
export type CollectionEvent = Record<never, never>;

/** 集合键类型，可以是字符串或数字 */
export type CollectionKey = string | number | symbol;

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
  toArray(
    filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>,
    mapper?: Nullable
  ): T[];

  /**
   * 将集合转换为数组（带映射器）
   * @template RT 映射后的类型
   * @param filter 可选的过滤函数
   * @param mapper 可选的映射函数
   */
  toArray<RT>(
    filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>,
    mapper?: createFunction<[T, CollectionKey, this, RT]>
  ): RT[];
}

/**
 * 集合类，提供基于键值的元素存储和管理
 * @template T 元素类型
 */
export class Collection<T = unknown> implements Iterable<T>, ToArray<T> {
  /** 获取元素键值的函数 */
  private declare getKey: CollectionGetKey<T>;
  /** 存储所有元素的数组 */
  private declare elements: Array<T>;
  /** 键值到数组索引的映射 */
  private declare indexMap: AnyMap<number>;

  /**
   * 创建集合实例
   * @param getKey 获取元素键值的函数
   */
  constructor(getKey?: CollectionGetKey<T>) {
    // 确保提供了获取键值的函数
    assert(getKey, "miss get unique key");
    this.getKey = getKey;
    // 初始化存储结构
    this.elements = new Array<T>();
    this.indexMap = new AnyMap<number>();
  }
  /**
   * 获得集合的实际元素数量
   */
  size(): number {
    return Reflect.ownKeys(this.elements).length;
  }
  /**
   *
   * @param key
   * @returns 存在返回下标，不存在返回-1
   */
  private getIndex(key: CollectionKey): number {
    const index = this.indexMap.get(key);
    return index === undefined ? -1 : index;
  }

  /**
   * 根据键值获取元素
   * @param key 元素的键值
   * @returns 对应的元素或undefined
   */
  get(key: CollectionKey) {
    return this.elements[this.getIndex(key)];
  }

  /**
   * 检查是否存在指定键值的元素
   * @param key 要检查的键值
   * @returns 是否存在
   */
  hasKey(key: CollectionKey) {
    return this.indexMap.has(key);
  }

  /**
   * 检查元素是否在集合中
   * @param element 要检查的元素
   * @returns 是否存在
   */
  hasElement(element: T) {
    return this.hasKey(this.getKey(element));
  }

  /**
   * 添加元素到集合
   * @param element 要添加的元素
   * @param force 当元素已存在时是否强制替换，默认为false
   */
  add(element: T, force?: boolean) {
    const key = this.getKey(element);
    let index = this.getIndex(key);
    if (index === -1) {
      // 元素不存在时，添加到数组末尾
      index = this.elements.push(element) - 1;
      this.indexMap.set(key, index);
    } else if (force) {
      // 元素存在且force为true时，替换原有元素，不更新index
      const index = this.indexMap.get(key);
      assert(index !== undefined);
      this.elements.splice(index, 1, element);
    }
  }

  /**
   * 使用指定的键值添加元素
   * @param key 指定的键值
   * @param element 要添加的元素
   * @param force 当键值已存在时是否强制替换，默认为false
   */
  addKey(key: CollectionKey, element: T, force?: boolean) {
    let index = this.getIndex(key);
    if (index === -1) {
      // 键值不存在时，添加到数组末尾
      index = this.elements.push(element) - 1;
      this.indexMap.set(key, index);
    } else if (force) {
      // 键值存在且force为true时，替换原有元素，不更新index
      this.elements.splice(index, 1, element);
    }
  }

  /**
   * 批量添加元素
   * @param iterator 可迭代的元素集合
   * @param force 当元素已存在时是否强制替换，默认为false
   */
  addAll(iterator: Iterable<T>, force?: boolean) {
    const { next }: Iterator<T, T> = iterator[Symbol.iterator]();
    let result = next();
    while (!result.done) {
      this.add(result.value, force);
      result = next();
    }
  }

  /**
   * 在指定位置插入元素
   * @param element 待插入的元素
   * @param index 插入位置，范围[0, length]。如果超出范围会被自动调整到有效范围内
   * @param force 当元素已存在时的处理选项
   * @param exist.index 是否保持原有元素的位置。true: 保持原位置，false: 使用新位置
   * @param exist.element 是否使用新元素替换原有元素。true: 使用新元素，false: 保持原有元素
   */
  insert(
    element: T,
    index: number,
    force?: { newIndex?: boolean; newElement?: boolean } | boolean
  ) {
    index = regressRange(index, [0, this.elements.length]);
    const key = this.getKey(element);
    const oIndex = this.getIndex(key);
    force = isObject(force)
      ? force
      : { newIndex: !!force, newElement: !!force };
    const { newIndex, newElement } = force;
    if (oIndex === -1) {
      // 元素不存在时，直接插入到指定位置
      this.elements.splice(index, 0, element);
      // 更新后续下标
      for (let i = index + 1; index < this.elements.length; i++) {
        const key = this.getKey(this.elements[i]);
        this.indexMap.set(key, i);
      }
    } else {
      // 元素已存在时的处理
      if (!newIndex && !newElement) {
        // 同时采用旧位置旧元素 等价于无变化
        return;
      }
      const oElement = this.elements[oIndex];
      const placeholder = Symbol("placegholder");
      // 使用占位符标记原位置
      this.elements[oIndex] = placeholder as unknown as T;
      if (!newIndex) {
        // 如果不采用新位置，则使用原位置
        index = oIndex;
      }

      if (index === oIndex) {
        this.elements.splice(index, 1, newElement ? element : oElement);
        if (newElement) {
          const oKey = this.getKey(oElement);
          // 删除旧元素的信息
          this.indexMap.delete(oKey);
          // 存储新元素
          const _key = this.getKey(element);
          this.indexMap.set(_key, index);
        }
      } else {
        // 插入新元素
        this.elements.splice(index, 0, newElement ? element : oElement);
        // 删除占位符
        this.elements.splice(index > oIndex ? oIndex : oIndex + 1, 1);
        if (newElement) {
          this.indexMap.delete(this.getKey(oElement));
          this.indexMap.set(this.getKey(element), index);
        }
        // 更新新旧下标之间的元素下标记录
        const [min, max] = [index, oIndex].sort((a, b) => a - b);
        for (let i = min; i < max; i++) {
          const _key = this.getKey(this.elements[i]);
          this.indexMap.set(_key, i);
        }
      }
    }
  }

  /**
   * 移除指定元素
   * @param element 要移除的元素
   * @returns 是否成功移除
   */
  removeElement(element: T): boolean {
    const key = this.getKey(element);
    return !!this.remove(key);
  }

  /**
   * 根据键值移除元素
   * @param key 要移除的元素的键值
   * @returns 被移除的元素，如果元素不存在则返回undefined
   */
  remove(key: CollectionKey): T | undefined {
    const has = this.indexMap.has(key);
    if (has) {
      // 获取元素在数组中的索引
      const index = this.indexMap.get(key);
      assert(index !== undefined);
      // 从数组中移除元素
      const removed = this.elements.splice(index, 1)[0];
      // 更新索引映射
      for (let i = index; i < this.elements.length; i++) {
        this.indexMap.set(this.getKey(this.elements[i]), i);
      }
      return removed;
    }
  }

  /**
   * 清空集合中的所有元素
   */
  clear() {
    this.elements.length = 0;
    this.indexMap.clear();
  }

  /**
   * 更新索引映射
   * 当元素数组发生变化时，需要重新计算每个元素的索引
   * @private
   */
  private updateIndexMap() {
    const { elements, indexMap } = this;
    const { length } = elements;

    indexMap.clear();
    for (let i = 0; i < length; i++) {
      const element = elements[i];
      const key = this.getKey(element);
      indexMap.set(key, i);
    }
  }

  /**
   * 实现Iterable接口，使集合可以被迭代
   * 使用生成器函数遍历集合中的所有元素
   * @yields 集合中的每个元素
   */
  [Symbol.iterator](): Iterator<T, T, undefined> {
    let i = 0;
    return {
      next: () => {
        const j = i;
        i++;
        return {
          value: this.elements[j],
          done: j >= this.elements.length,
        };
      },
    };
  }

  /**
   * 遍历集合中的所有元素
   * @param handler 处理每个元素的回调函数，(element, key, index, this): void
   */
  each(handler: createFunction<[T, CollectionKey, number, this, void]>) {
    this.elements.forEach((element, index) =>
      handler(element, this.getKey(element), index, this)
    );
  }

  toArray<RT = T>(
    filter?: Nullable | createFunction<[T, CollectionKey, this, boolean]>,
    mapper?: Nullable | createFunction<[T, CollectionKey, this, RT]>
  ): RT[] {
    const result: RT[] = [];
    const elements = this.elements;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const key = this.getKey(element);

      // 如果有过滤函数且返回false，则跳过当前元素
      if (filter && !filter(element, key, this)) {
        continue;
      }

      // 如果有映射函数，使用映射后的值；否则直接使用原始值
      const value = mapper
        ? mapper(element, key, this)
        : (element as unknown as RT);

      result.push(value);
    }

    return result;
  }
}
