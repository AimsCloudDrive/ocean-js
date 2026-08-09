/**
 * 执行大量不阻塞浏览器的同步任务
 * @param tasks 任务列表
 * @param chunkSplitor 分时函数 默认采用requestIdleCallback 没有则判断执行时间是否超过16.6ms
 * @returns
 */
export declare function performChunk(tasks: ((index: number) => void)[], option?: {
    chunkSplitor?: (task: (isContinue: (elapsedTime: number) => boolean) => void) => void;
    onEnd?: () => void;
}): void;
export declare const FRAME_INTERVAL: number;
