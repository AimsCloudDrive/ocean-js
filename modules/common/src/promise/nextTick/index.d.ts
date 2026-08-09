/**
 * 执行延迟调用
 * @param task 延迟执行的函数
 * @returns 唯一ID
 */
export declare const nextTick: (task: () => void) => string;
/**
 * 取消延迟调用
 * @param id nextTick返回的唯一ID
 */
export declare const cancelNextTick: (id: string) => void;
