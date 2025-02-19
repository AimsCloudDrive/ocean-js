import { tryCall } from "../global";

export function isArray<T>(o: unknown): o is Array<T> {
  return Array.isArray(o);
}

/**
 * 基础类型的键类型
 */
type PrimitiveKey = string | number | boolean | null | undefined;

/**
 * 用于存储元素计数的接口
 */
interface CountMap {
  count: number;
}

/**
 * 用于存储对象元素的接口
 */
interface ObjectCountMap extends CountMap {
  obj: object;
}

/**
 * 用于存储不同类型元素的映射集合
 */
interface TypeMaps {
  primitiveMap: Map<PrimitiveKey, CountMap>;
  objectMap: Map<symbol, ObjectCountMap>;
}

/**
 * 比较新旧数组，找出所有新增和删除的元素
 * @param newArr 新数组
 * @param oldArr 旧数组
 * @param insert 处理新增元素的回调函数
 * @param del 处理删除元素的回调函数
 */
export function compareArray<T>(
  newArr: T[],
  oldArr: T[],
  insert?: (items: T[]) => void,
  del?: (items: T[]) => void
) {
  // 用于存储对象到唯一标识符的映射
  const objectKey = new WeakMap<object, symbol>();

  // 初始化旧数组的映射集合
  const oldMaps: TypeMaps = {
    primitiveMap: new Map(),
    objectMap: new Map(),
  };

  // 初始化新数组的映射集合
  const newMaps: TypeMaps = {
    primitiveMap: new Map(),
    objectMap: new Map(),
  };

  /**
   * 将元素添加到映射集合中
   * @param maps 目标映射集合
   * @param key 要添加的元素
   */
  const addMap = (maps: TypeMaps, key: T) => {
    if (key === null || typeof key === "object" || typeof key === "function") {
      // 处理对象类型
      const objKey = key as object;
      // 获取或创建对象的唯一标识符
      const keySymbol = objectKey.get(objKey) || createAndSetSymbol(objKey);
      // 获取或创建计数对象
      const value =
        maps.objectMap.get(keySymbol) ||
        createObjectMapEntry(maps, keySymbol, objKey);
      // 增加计数
      value.count++;
    } else {
      // 处理基本类型
      const primitiveKey = key as PrimitiveKey;
      // 获取或创建计数对象
      const value =
        maps.primitiveMap.get(primitiveKey) ||
        createMapEntry(maps.primitiveMap, primitiveKey);
      // 增加计数
      value.count++;
    }
  };

  /**
   * 为对象创建并设置唯一标识符
   * @param key 对象
   * @returns 创建的唯一标识符
   */
  const createAndSetSymbol = (key: object): symbol => {
    const keySymbol = Symbol();
    objectKey.set(key, keySymbol);
    return keySymbol;
  };

  /**
   * 创建对象类型的计数条目
   * @param maps 映射集合
   * @param keySymbol 对象的唯一标识符
   * @param obj 对象本身
   * @returns 创建的计数对象
   */
  const createObjectMapEntry = (
    maps: TypeMaps,
    keySymbol: symbol,
    obj: object
  ): ObjectCountMap => {
    const value = { count: 0, obj };
    maps.objectMap.set(keySymbol, value);
    return value;
  };

  /**
   * 创建基本类型的计数条目
   * @param map 目标映射
   * @param key 基本类型值
   * @returns 创建的计数对象
   */
  const createMapEntry = (
    map: Map<PrimitiveKey, CountMap>,
    key: PrimitiveKey
  ): CountMap => {
    const value = { count: 0 };
    map.set(key, value);
    return value;
  };

  // 构建新旧数组的映射
  oldArr.forEach((item) => addMap(oldMaps, item));
  newArr.forEach((item) => addMap(newMaps, item));

  // 存储新增和删除的元素
  const inserts: T[] = [];
  const dels: T[] = [];

  // 比较基本类型元素
  compareMapEntries(oldMaps.primitiveMap, newMaps.primitiveMap, inserts, dels);

  // 比较对象类型元素
  compareObjectMapEntries(
    oldMaps.objectMap,
    newMaps.objectMap,
    objectKey,
    inserts,
    dels
  );

  // 调用回调函数处理变更
  if (inserts.length > 0 && insert) {
    tryCall(insert, [inserts]);
  }
  if (dels.length > 0 && del) {
    tryCall(del, [dels]);
  }
}

/**
 * 比较基本类型元素的映射
 * @param oldMap 旧映射
 * @param newMap 新映射
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export function compareMapEntries<T>(
  oldMap: Map<PrimitiveKey, CountMap>,
  newMap: Map<PrimitiveKey, CountMap>,
  inserts: T[],
  dels: T[]
) {
  // 遍历旧映射，比较元素数量变化
  oldMap.forEach((value, key) => {
    const newValue = newMap.get(key);
    updateArrays(key as T, value.count, newValue?.count || 0, inserts, dels);
    // 处理完后从新映射中删除，剩余的就是新增的
    newMap.delete(key);
  });

  // 处理纯新增的元素
  newMap.forEach((value, key) => {
    inserts.push(...new Array(value.count).fill(key as T));
  });
}

/**
 * 比较对象类型元素的映射
 * @param oldMap 旧映射
 * @param newMap 新映射
 * @param objectKey 对象到唯一标识符的映射
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export function compareObjectMapEntries<T>(
  oldMap: Map<symbol, ObjectCountMap>,
  newMap: Map<symbol, ObjectCountMap>,
  objectKey: WeakMap<object, symbol>,
  inserts: T[],
  dels: T[]
) {
  // 遍历旧映射，比较元素数量变化
  oldMap.forEach((value) => {
    const keySymbol = objectKey.get(value.obj);
    if (keySymbol) {
      const newValue = newMap.get(keySymbol);
      updateArrays(
        value.obj as T,
        value.count,
        newValue?.count || 0,
        inserts,
        dels
      );
      // 处理完后从新映射中删除，剩余的就是新增的
      newMap.delete(keySymbol);
    }
  });

  // 处理纯新增的元素
  newMap.forEach((value) => {
    inserts.push(...new Array(value.count).fill(value.obj as T));
  });
}

/**
 * 根据元素数量变化更新新增和删除数组
 * @param item 要处理的元素
 * @param oldCount 旧数量
 * @param newCount 新数量
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export function updateArrays<T>(
  item: T,
  oldCount: number,
  newCount: number,
  inserts: T[],
  dels: T[]
) {
  if (newCount < oldCount) {
    // 数量减少，添加到删除数组
    dels.push(...new Array(oldCount - newCount).fill(item));
  } else if (newCount > oldCount) {
    // 数量增加，添加到新增数组
    inserts.push(...new Array(newCount - oldCount).fill(item));
  }
}
