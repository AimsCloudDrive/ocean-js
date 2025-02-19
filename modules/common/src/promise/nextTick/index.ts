import { tryCall } from "../../global";

/**
 * 于执行延迟调用，并返回一个取消执行的函数
 * @param task 延迟执行的函数
 * @returns cancel
 */
const nextTickStore = {
  id: 0,
  tickMap: new Map<number, { cancel?: () => void }>(),
};

/**
 *
 * @param task
 * @returns
 */
export const nextTick = (task: () => void) => {
  const { id, tickMap } = nextTickStore;
  const option: { cancel?: () => void } = Object.create(null);
  const _option = {
    canceled: false,
  };
  tickMap.set(id, option);
  nextTickStore.id++;
  const _task = () => {
    option.cancel = () => {
      _option.canceled = true;
      option.cancel = undefined;
    };
    return () => {
      if (!_option.canceled) {
        task();
      }
      option.cancel = undefined;
    };
  };
  if (typeof process !== "undefined" && process.nextTick) {
    // node
    process.nextTick(_task());
  } else if (typeof queueMicrotask !== "undefined") {
    // 浏览器
    queueMicrotask(_task());
  } else if (typeof MutationObserver !== "undefined") {
    // 浏览器
    const ob = new MutationObserver(() => {
      if (!_option.canceled) {
        task();
      }
      option.cancel = undefined;
    });
    const dom = document.createTextNode(String(id)); // 创建文本节点
    ob.observe(dom, {
      characterData: true,
    });
    dom.data = String(id + 1); // 触发变化
    // 加入微队列后才注册取消函数
    option.cancel = () => {
      _option.canceled = true;
      option.cancel = undefined;
    };
    ob.disconnect();
    dom.remove();
  } else {
    // 浏览器
    const id = setTimeout(task, 0);
    option.cancel = () => {
      clearTimeout(id);
      option.cancel = undefined;
    };
  }
  return id;
};

/**
 *
 * @param id nextTick返回的id
 */
export const cancelNextTick = (id: number) => {
  const { tickMap } = nextTickStore;
  const option = tickMap.get(id);
  if (option?.cancel) {
    tryCall(option?.cancel);
  }
};
