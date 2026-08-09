import { OcPromise } from "../promise/OcPromise";
/**
 * 防抖函数：延迟执行目标函数，在频繁触发时只执行最后一次
 *
 * @template T 目标函数的类型签名
 * @param callable 需要防抖的目标函数
 * @param {number | undefined} [wait=100] wait 等待时间（毫秒），默认 100ms
 * @param options 配置选项
 * @param {boolean | undefined} [options.leading=false] options.leading 前置执行
 * @param {boolean | undefined} [options.trailing=true] options.trailing 后置执行
 * @param {number | undefined} options.maxWait 如果超过maxWait等待时间，则调用时等同于前置执行
 * @returns 经过防抖处理的新函数，并附加取消方法
 *
 * ### 特性
 * 1. 支持 TypeScript 类型推断
 * 2. 配置前置执行（leading）和后置执行（trailing）
 * 3. 提供取消执行方法（cancel）
 * 4. 自动管理函数上下文（this）和参数
 * 5. 处理异步错误（通过 Promise 返回）
 * 6. 边界值安全处理
 */
declare function debounce<T extends (...args: any[]) => any, Args extends Parameters<T> = Parameters<T>, Returns extends ReturnType<T> = ReturnType<T>>(callable: T, wait?: number, options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}): (...args: Args) => OcPromise<Returns, any, any>;
export { debounce };
