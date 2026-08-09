import { Nullable, createFunction } from "../../global";
import { OcPromiseCanceledException } from "./OcPromiseCanceledException";
import { Cancel, InferResultC, InferResultE, InferResultR, OcPromiseExecutor, OcPromiseLike, OcPromiseStatus, Reject, Resolve } from "./types";
/**
 * OcPromise 类 - 扩展的 Promise 实现，支持取消操作
 * @template R - 成功状态的返回值类型
 * @template E - 错误类型
 * @template C - 取消操作的原因类型
 */
export declare class OcPromise<R = never, E = never, C = never> implements OcPromiseLike<R, E, C> {
    /** 当前 Promise 的状态 */
    status: OcPromiseStatus;
    /** 处理函数队列 */
    private handlers;
    /** 存储当前值（完成值/错误/取消原因） */
    data?: R | E | OcPromiseCanceledException<C>;
    /** 父 Promise，用于取消操作的传播 */
    private parrent;
    /**
     * 创建 OcPromise 实例
     * @param executor 执行器函数，接收 resolve、reject 和 cancel 函数
     */
    constructor(executor: OcPromiseExecutor<R, E, C>);
    /**
     * 添加完成、错误和取消的处理函数
     */
    then<TR = R, TE = E, TC = C>(onFulfilled?: Nullable | createFunction<[R, TR]>, onRejected?: Nullable | createFunction<[E, TE]>, onCanceled?: Nullable | createFunction<[C, TC]>): OcPromise<InferResultR<TR, TE, TC>, InferResultE<TR, TE, TC>, InferResultC<TR, TE, TC>>;
    /**
     * 改变 Promise 状态
     * @private
     * @template T - 目标状态类型
     * @template D - 数据类型
     * @param status - 新状态
     * @param data - 相关数据
     */
    private changeStatus;
    /**
     * 执行处理函数队列
     * @private
     */
    private _runThens;
    /**
     * 取消 Promise
     * @param reason - 取消原因
     * @param cascade - 是否向上层级寻找层叠，默认 true
     */
    cancel(reason?: C, cascade?: boolean): void;
    /**
     * 等待所有 Promise 完成
     * @static
     * @template T - 元素类型
     * @param promiseables - Promise 或值的可迭代对象
     * @returns 包含所有结果的 Promise
     */
    static all<T>(promiseables: Iterable<T | OcPromiseLike<Awaited<T>>>): OcPromise<Awaited<T>[]>;
    /**
     * withResolvers
     */
    static withResolvers<T = unknown, E = unknown, C = unknown>(): {
        readonly promise: OcPromise<T, E, C>;
        readonly resolve: Resolve<T>;
        readonly reject: Reject<E>;
        readonly cancel: Cancel<C>;
    };
    /**
     * 创建一个已完成的 Promise
     * @static
     * @template T - 值的类型
     * @param value - 要解析的值
     */
    static resolve<T>(value: T): OcPromise<InferResultR<T>, InferResultE<T>, InferResultC<T>>;
    /**
     * 创建一个已拒绝的 Promise
     * @static
     * @template E - 错误类型
     * @param reason - 拒绝原因
     */
    static reject<E = unknown>(reason: E): OcPromise<never, E>;
    /**
     * 创建一个已取消的 Promise
     * @static
     * @template C - 取消类型
     * @param reason - 取消原因
     * @returns
     */
    static cancel<C = unknown>(reason: C): OcPromise<never, never, C>;
    /**
     * 添加取消处理函数
     * @param onCanceled - 取消处理函数
     */
    canceled(onCanceled: Cancel<C>): OcPromise<InferResultR<R, E, void>, InferResultE<R, E, void>, InferResultC<R, E, void>>;
    /**
     * 添加错误处理函数
     * @param onRejected - 错误处理函数
     */
    catch(onRejected: Reject<E>): OcPromise<InferResultR<R, void, C>, InferResultE<R, void, C>, InferResultC<R, void, C>>;
    /** 获取当前数据 */
    getData(): E | R | OcPromiseCanceledException<C> | undefined;
    /** 获取当前状态 */
    getStatus(): OcPromiseStatus;
}
export interface PromiseResolvers<T = unknown, E = unknown, C = unknown> {
    resolve: Resolve<T>;
    reject: Reject<E>;
    cancel: Cancel<C>;
}
/**
 * 检查值是否为 OcPromise 实例
 * @template PR - Promise 结果类型
 * @template PE - Promise 错误类型
 * @template PC - Promise 取消类型
 * @param data - 要检查的值
 */
export declare function isOcPromise<PR = any, PE = any, PC = any>(data: unknown): data is OcPromise<PR, PE, PC>;
