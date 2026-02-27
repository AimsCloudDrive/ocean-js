import { regressRange } from "../number";
import { CANCELED, OcPromise, PENDDING } from "../promise/OcPromise";

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
function debounce<
  T extends (...args: any[]) => any,
  Args extends Parameters<T> = Parameters<T>,
  Returns extends ReturnType<T> = ReturnType<T>,
>(
  callable: T,
  wait: number = 100,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {},
): (...args: Args) => OcPromise<Returns, any, any> {
  // 参数校验
  if (typeof callable !== "function") {
    throw new TypeError("Expected a function");
  }
  if (typeof wait !== "number" || wait < 0) {
    throw new TypeError("Wait must be a non-negative number");
  }

  // 配置处理
  let {
    leading = false, // 是否在前沿立即执行
    trailing = true, // 是否在尾部延迟执行
    maxWait, // 最大等待时间（类似节流）
  } = options;

  maxWait =
    typeof maxWait === "number" ? regressRange(maxWait, [wait]) : maxWait;

  // 状态变量
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any;
  let lastResult: OcPromise<Returns, any, any>;
  let pendingResolve: ((value: Returns) => void) | null = null;

  // 清除定时器
  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  // 执行目标函数
  const invokeFunction = () => {
    if (!lastArgs) return;

    try {
      const result = callable.apply(lastThis, lastArgs);
      if (pendingResolve) {
        pendingResolve(result);
        pendingResolve = null;
      }
      return result;
    } catch (error) {
      // 保持错误传播
      if (pendingResolve) {
        pendingResolve(OcPromise.reject(error) as any);
        pendingResolve = null;
      }
      throw error;
    }
  };

  // 启动计时器
  const startTimer = (pendingCallback: () => void, delay: number) => {
    clearTimer();
    timerId = setTimeout(pendingCallback, delay);
  };

  // 防抖主函数
  const debounced = function (this: any, ...args: any[]) {
    if (lastResult && lastResult.getStatus() === PENDDING) {
      lastResult.cancel("reCall");
    }
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    // 1. 首次调用处理
    if (lastCallTime === null) {
      lastCallTime = now;
    }

    // 2. 计算等待时间
    const timeSinceLastCall = now - (lastCallTime || 0);
    const shouldCallLeading = leading && timeSinceLastCall >= wait;

    // 3. 最大等待时间处理（类似节流）
    const maxWaitExpired =
      maxWait !== undefined && now - (lastCallTime || 0) >= maxWait;

    // 4. 执行策略
    if (shouldCallLeading || maxWaitExpired) {
      // 立即执行并重置状态
      clearTimer();
      lastCallTime = now;
      lastResult = new OcPromise<Returns>((resolve) => {
        pendingResolve = resolve;
        invokeFunction();
      });
    } else if (trailing) {
      // 延迟执行
      lastResult = new OcPromise<Returns>((resolve) => {
        pendingResolve = resolve;
        startTimer(() => {
          lastCallTime = Date.now();
          invokeFunction();
        }, wait);
      });
    } else {
      // 不需要执行时返回 pending promise
      lastResult = new OcPromise<Returns>(() => {});
    }
    lastResult.canceled(() => {
      clearTimer();
      lastCallTime = null;
      lastArgs = null;
      pendingResolve = null;
    });
    return lastResult;
  };

  return debounced;
}

export { debounce };
