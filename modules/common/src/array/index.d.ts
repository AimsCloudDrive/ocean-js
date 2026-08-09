export declare function isArray<T extends unknown, R extends Extract<T, any[]>>(o: T): o is R;
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
 * 比较新旧数组，找出所有新增和删除的元素
 * @param newArr 新数组
 * @param oldArr 旧数组
 * @param insert 处理新增元素的回调函数
 * @param del 处理删除元素的回调函数
 */
export declare function compareArray<T>(newArr: T[], oldArr: T[], insert?: (items: T[]) => void, del?: (items: T[]) => void): void;
/**
 * 比较基本类型元素的映射
 * @param oldMap 旧映射
 * @param newMap 新映射
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export declare function compareMapEntries<T>(oldMap: Map<PrimitiveKey, CountMap>, newMap: Map<PrimitiveKey, CountMap>, inserts: T[], dels: T[]): void;
/**
 * 比较对象类型元素的映射
 * @param oldMap 旧映射
 * @param newMap 新映射
 * @param objectKey 对象到唯一标识符的映射
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export declare function compareObjectMapEntries<T>(oldMap: Map<symbol, ObjectCountMap>, newMap: Map<symbol, ObjectCountMap>, inserts: T[], dels: T[]): void;
/**
 * 根据元素数量变化更新新增和删除数组
 * @param item 要处理的元素
 * @param oldCount 旧数组元素数量
 * @param newCount 新数组元素数量
 * @param inserts 存储新增元素的数组
 * @param dels 存储删除元素的数组
 */
export declare function updateArrays<T>(item: T, oldCount: number, newCount: number, inserts: T[], dels: T[]): void;
export {};
