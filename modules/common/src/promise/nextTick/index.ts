import { tryCall } from "../../global";
import { uuidv7 } from "uuidv7";

/**
 * 执行延迟调用，并返回一个唯一ID
 * @param task 延迟执行的函数
 * @returns 唯一ID
 */
const nextTickStore = {
  tickMap: new Map<string, { cancel?: () => void }>(),
};

/**
 * 执行延迟调用
 * @param task 延迟执行的函数
 * @returns 唯一ID
 */
export const nextTick = (task: () => void): string => {
  const currentId = uuidv7();
  const option: { cancel?: () => void } = Object.create(null);
  const _option = {
    canceled: false,
  };

  const cleanup = () => {
    nextTickStore.tickMap.delete(currentId);
  };

  const _task = () => {
    option.cancel = () => {
      _option.canceled = true;
      option.cancel = undefined;
      cleanup();
    };
    return () => {
      if (!_option.canceled) {
        task();
        option.cancel = undefined;
        cleanup();
      }
    };
  };

  if (typeof process !== "undefined" && process.nextTick) {
    // node
    nextTickStore.tickMap.set(currentId, option);
    process.nextTick(_task());
  } else if (typeof globalThis.queueMicrotask === "function") {
    // 浏览器
    nextTickStore.tickMap.set(currentId, option);
    queueMicrotask(_task());
  } else if (typeof globalThis.MutationObserver === "function") {
    // 浏览器
    const ob = new MutationObserver(() => {
      if (!_option.canceled) {
        task();
        option.cancel = undefined;
        cleanup();
      }
    });
    const dom = document.createTextNode(currentId); // 创建文本节点
    nextTickStore.tickMap.set(currentId, option);
    ob.observe(dom, {
      characterData: true,
    });
    dom.data = currentId + "1"; // 触发变化
    // 加入微队列后才注册取消函数
    option.cancel = () => {
      _option.canceled = true;
      option.cancel = undefined;
      cleanup();
    };
  } else {
    // 浏览器
    const timeoutId = setTimeout(() => {
      if (!_option.canceled) {
        task();
        option.cancel = undefined;
        cleanup();
      }
    }, 0);
    nextTickStore.tickMap.set(currentId, option);
    option.cancel = () => {
      clearTimeout(timeoutId);
      _option.canceled = true;
      option.cancel = undefined;
      cleanup();
    };
  }

  return currentId;
};

/**
 * 取消延迟调用
 * @param id nextTick返回的唯一ID
 */
export const cancelNextTick = (id: string) => {
  const { tickMap } = nextTickStore;
  const option = tickMap.get(id);
  if (option?.cancel) {
    tryCall(option.cancel);
  }
};
