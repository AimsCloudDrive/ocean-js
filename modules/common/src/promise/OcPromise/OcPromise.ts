import { OcPromiseRejectError } from "./OcPromiseError";
import { Nullable, createFunction, tryCall } from "../../global";
import {
  OcPromiseExecutor,
  Resolve,
  FULFILLED,
  Reject,
  REJECTED,
  Cancel,
  CANCELED,
  Fulfilled,
  Rejected,
  Canceled,
  PENDDING,
  OcPromiseLike,
  ReturnTypeNotUndeF,
  OcPromiseStatus,
} from "./types";
import { isOcPromiseLike, isPromiseLike } from "./utils";
import { nextTick } from "../nextTick";

/**
 * OcPromise 类 - 扩展的 Promise 实现，支持取消操作
 * @template R - 成功状态的返回值类型
 * @template E - 错误类型，默认为 OcPromiseRejectError
 * @template C - 取消操作的原因类型
 */
export class OcPromise<
  R,
  E extends Error | unknown = OcPromiseRejectError,
  C = unknown
> implements OcPromiseLike<R, E, C>
{
  /** 当前 Promise 的状态 */
  declare status: OcPromiseStatus;

  /** 处理函数队列 */
  private declare handlers: {
    resolve: Resolve<unknown>;
    reject: Reject<Error | unknown>;
    cancel: Cancel<unknown>;
    onfulfilled: Nullable | createFunction<[R, unknown]>;
    onrejected: Nullable | createFunction<[E | unknown, unknown]>;
    oncanceled: Nullable | createFunction<[C, unknown]>;
  }[];

  /** 存储当前值（完成值/错误/取消原因） */
  declare data: R | E | C;

  /** 父 Promise，用于取消操作的传播 */
  private declare parrent:
    | OcPromise<unknown, Error | unknown, unknown>
    | undefined;

  /**
   * 创建 OcPromise 实例
   * @param executor 执行器函数，接收 resolve、reject 和 cancel 函数
   */
  constructor(executor: OcPromiseExecutor<R, E, C>) {
    // 初始化为等待状态
    this.status = PENDDING;
    // 初始化处理函数队列
    this.handlers = [];

    // 创建 resolve 处理函数
    const resolve: Resolve<R> = (data: R) => {
      if (isOcPromise(data) || isOcPromiseLike(data)) {
        data.then(resolve, reject, cancel);
      } else if (isPromiseLike(data)) {
        data.then(resolve, reject);
      } else {
        // 将状态改为已完成
        this.changeStatus(FULFILLED, data);
      }
    };

    // 创建 reject 处理函数
    const reject: Reject<E | unknown> = (reason) => {
      // 将状态改为已拒绝
      this.changeStatus(REJECTED, reason as E);
    };

    // 创建 cancel 处理函数
    const cancel: Cancel<C> = (reason: C) => {
      // 将状态改为已取消
      this.changeStatus(CANCELED, reason);
    };

    try {
      // 执行传入的执行器函数
      executor(resolve, reject, cancel);
    } catch (e: unknown) {
      // 如果执行器抛出错误，将 Promise 状态改为已拒绝
      reject(e);
    }
  }

  /**
   * 改变 Promise 状态
   * @private
   * @template T - 目标状态类型
   * @template D - 数据类型
   * @param status - 新状态
   * @param data - 相关数据
   */
  private changeStatus<
    T extends OcPromiseStatus,
    D extends R | E | C = T extends Fulfilled
      ? R
      : T extends Rejected
      ? R
      : T extends Canceled
      ? C
      : never
  >(status: T, data: D) {
    // 只有在等待状态时才能改变状态
    if (this.status !== PENDDING) {
      return;
    }
    // 更新状态和数据
    this.status = status;
    this.data = data;
    // 执行处理函数队列
    this._runThens();
  }

  /**
   * 执行处理函数队列
   * @private
   */
  private _runThens() {
    // 只有在非等待状态时才执行处理函数
    if (this.status === PENDDING) {
      return;
    }

    // 依次处理队列中的处理函数
    while (this.handlers.length) {
      // 取出队列中的第一个处理函数组
      const handler = this.handlers.shift()!;
      const { resolve, reject, cancel, onfulfilled, onrejected, oncanceled } =
        handler;

      // 根据当前状态选择要执行的处理函数，未传对应处理函数则状态穿透
      const exe =
        this.status === FULFILLED
          ? onfulfilled
            ? // 如果有完成处理函数，则调用它
              () => tryCall(onfulfilled, [this.data as R])
            : // 否则直接调用 resolve
              (resolve(this.data), undefined)
          : this.status === REJECTED
          ? onrejected
            ? // 如果有拒绝处理函数，则调用它
              () => tryCall(onrejected, [this.data as E])
            : // 否则直接调用 reject
              (reject(this.data), undefined)
          : oncanceled
          ? // 如果有取消处理函数，则调用它
            () => tryCall(oncanceled, [this.data as C])
          : // 否则直接调用 cancel
            (cancel(this.data), undefined);

      // 如果没有要执行的函数thenable回调，继续下一个
      if (!exe) continue;

      // 创建异步任务
      const task = () => {
        try {
          // 执行处理函数
          const data = exe();
          if (isOcPromise(data) || isOcPromiseLike(data)) {
            // 如果返回值是 OcPromise，则链接它的处理函数
            nextTick(() => {
              data.then(
                resolve,
                reject,
                (reason) => (this.cancel(reason as C), cancel(reason as C))
              );
            });
          } else if (isPromiseLike(data)) {
            // 如果返回值是 Promise，则链接它的处理函数
            nextTick(() => {
              data.then(resolve, reject);
            });
          } else {
            // 其他情况直接 resolve
            resolve(data);
          }
        } catch (e) {
          // 如果执行过程中出错，则 reject
          reject(e);
        }
      };
      // 将任务加入下一个事件循环
      nextTick(task);
    }
  }

  /**
   * 添加完成、错误和取消的处理函数
   * @template TR - 完成处理函数的返回类型
   * @template TE - 错误处理函数的返回类型
   * @template TC - 取消处理函数的返回类型
   * @template FR - 最终返回值类型
   */
  then<
    TR extends Nullable | createFunction<[R, unknown]>,
    TE extends Nullable | createFunction<[E, unknown]>,
    TC extends Nullable | createFunction<[C, unknown]>,
    FR = ReturnTypeNotUndeF<TR | TE | TC>
  >(
    onfulfilled?: TR,
    onrejected?: TE,
    oncanceled?: TC
  ): OcPromise<FR, Error, unknown> {
    // 创建新的 Promise 实例
    const res = new OcPromise<FR, Error, unknown>((resolve, reject, cancel) => {
      // 将处理函数添加到队列
      this.handlers.push({
        resolve,
        reject,
        cancel,
        onfulfilled,
        onrejected,
        oncanceled,
      });
      // 尝试执行处理函数队列
      this._runThens();
    });
    // 设置父 Promise，用于取消操作的传播
    res.parrent = this;

    return res;
  }

  /**
   * 取消 Promise
   * @param reason - 取消原因
   */
  cancel(reason: C) {
    if (this.parrent) {
      this.parrent.cancel(reason);
    } else {
      this.changeStatus(CANCELED, reason);
    }
  }

  /**
   * 等待所有 Promise 完成
   * @static
   * @template T - 元素类型
   * @param proms - Promise 或值的可迭代对象
   * @returns 包含所有结果的 Promise
   */
  static all<T>(
    proms: Iterable<T | OcPromiseLike<Awaited<T>, Error>>
  ): OcPromise<Awaited<T>[]> {
    // 存储所有 Promise 的结果
    const result: Awaited<T>[] = [];

    return new OcPromise<Awaited<T>[]>((resolve, reject, cancel) => {
      // 处理单个 Promise 完成的情况
      const _resolve = (data: Awaited<T>, index: number) => {
        // 将结果存储到对应位置
        result[index] = data;
        finished++;
        // 如果所有 Promise 都完成，则 resolve
        if (finished === i) resolve(result);
      };

      let i: number = 0, // Promise 总数
        finished: number = 0; // 已完成的 Promise 数量

      // 遍历可迭代对象
      const iterator = proms[Symbol.iterator]();
      let next: ReturnType<typeof iterator.next> = iterator.next();

      while (!next.done) {
        const j = i;
        i++;
        const { value } = next;

        if (isOcPromise<Awaited<T>, Error, Error>(value)) {
          // 处理 OcPromise
          value.then((data) => _resolve(data, j), reject, cancel);
        } else if (isPromiseLike<Awaited<T>, unknown>(value)) {
          // 处理普通 Promise
          value.then((data) => _resolve(data, j), reject);
        } else {
          // 处理非 Promise 值
          result[j] = value as Awaited<T>;
          finished++;
        }
        next = iterator.next();
      }

      // 如果所有值都已处理完成，直接 resolve
      if (finished === i) {
        resolve(result);
      }
    });
  }

  /**
   * 创建一个已完成的 Promise
   * @static
   * @template T - 值的类型
   * @param value - 要解析的值
   */
  static resolve<T = void>(value: T): OcPromise<T> {
    if (isOcPromise<T>(value)) {
      return value;
    }
    if (isOcPromiseLike<T>(value)) {
      return new OcPromise<T>((resolve, reject, cancel) => {
        value.then(resolve, reject, cancel);
      });
    }
    if (isPromiseLike<T>(value)) {
      return new OcPromise<T>((resolve, reject) => {
        value.then(resolve, reject);
      });
    }
    return new OcPromise((resolve) => {
      resolve(value);
    });
  }

  /**
   * 创建一个已拒绝的 Promise
   * @static
   * @template E - 错误类型
   * @param reason - 拒绝原因
   */
  static reject<E extends OcPromiseRejectError | unknown = unknown>(
    reason: E
  ): OcPromise<unknown, E> {
    return new OcPromise((_, reject) => {
      reject(reason);
    });
  }

  /**
   * 添加取消处理函数
   * @param oncanceled - 取消处理函数
   */
  canceled(oncanceled: Cancel<C>) {
    return this.then(null, null, oncanceled);
  }

  /**
   * 添加错误处理函数
   * @param onRejected - 错误处理函数
   */
  catch(onRejected: Reject<E>) {
    return this.then(null, onRejected, null);
  }

  /** 获取当前数据 */
  getData() {
    return this.data;
  }

  /** 获取当前状态 */
  getStatus() {
    return this.status;
  }
}

/**
 * 检查值是否为 OcPromise 实例
 * @template PR - Promise 结果类型
 * @template PE - Promise 错误类型
 * @template PC - Promise 取消类型
 * @param data - 要检查的值
 */
export function isOcPromise<
  PR,
  PE extends Error | unknown = Error,
  PC = unknown
>(data: unknown): data is OcPromise<PR, PE, PC> {
  return data instanceof OcPromise;
}
