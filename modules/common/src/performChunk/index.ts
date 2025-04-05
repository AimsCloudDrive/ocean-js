/**
 * 执行大量不阻塞浏览器的同步任务
 * @param tasks 任务列表
 * @param chunkSplitor 分时函数 默认采用requestIdleCallback 没有则判断执行时间是否超过16.6ms
 * @returns
 */
export function performChunk(
  tasks: ((index: number) => void)[],
  option: {
    chunkSplitor?: (
      task: (isContinue: (elapsedTime: number) => boolean) => void
    ) => void;
    onEnd?: () => void;
  } = {}
) {
  if (tasks.length === 0) return;
  let { chunkSplitor, onEnd } = option;
  if (
    typeof chunkSplitor !== "function" &&
    typeof globalThis.requestIdleCallback === "function"
  ) {
    chunkSplitor = (task) => {
      globalThis.requestIdleCallback((idle) => {
        task((elapsedTime) => idle.timeRemaining() > 0);
      });
    };
  }
  if (!chunkSplitor) {
    chunkSplitor = (task) => {
      task((elapsedTime) => elapsedTime < FRAME_INTERVAL);
    };
  }
  const _chunkSplitor = chunkSplitor;
  let i = 0;
  function _run() {
    if (i === tasks.length) {
      onEnd && onEnd();
      return;
    }
    _chunkSplitor((isContinue) => {
      const now = Date.now();
      while (isContinue(Date.now() - now) && i < tasks.length) {
        console.info(i, tasks.length);
        tasks[i](i);
        i++;
      }
    });
    _run();
  }
  _run();
}

export const FRAME_INTERVAL = 1000 / 60;
