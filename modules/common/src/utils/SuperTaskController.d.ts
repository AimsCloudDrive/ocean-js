import { OcPromise } from "../promise";
/**
 * 任务控制器的配置选项
 * @property accompanyingCount 并发执行的任务数量
 */
export type SuperTaskControllerOption = {
    accompanyingCount?: number;
};
/**
 * 超级任务控制器
 * 用于管理和控制异步任务的执行，支持并发控制
 */
export declare class SuperTaskController {
    /** 存储待执行的任务队列 */
    private tasks;
    /** 允许同时执行的任务数量 */
    private accompanyingCount;
    /** 当前正在执行的任务数量 */
    private runningCount;
    /**
     * 创建任务控制器实例
     * @param option 控制器配置选项
     */
    constructor(option?: SuperTaskControllerOption);
    /**
     * 添加新任务到控制器
     * @template T 任务返回值的类型
     * @param task 要执行的任务函数
     * @returns 返回一个Promise，当任务执行完成时解决
     */
    addTask<T>(task: () => T): OcPromise<T>;
    /**
     * 执行任务的私有方法
     * 根据并发限制和任务队列状态来执行任务
     * @private
     */
    private run;
}
