/**
 * 超级任务控制器
 * 用于管理和控制异步任务的执行，支持并发控制
 */
export class SuperTaskController {
  /**
   * 创建任务控制器实例
   * @param {{accompanyingCount?: number}} option 控制器配置选项
   */
  constructor(option) {
    // 初始化配置选项
    option = option || {};
    // 设置并发数量，默认为2
    this.accompanyingCount = Number(option.accompanyingCount) || 2;
    // 初始化任务队列
    this.tasks = [];
    // 初始化运行中的任务数量
    this.runningCount = 0;
  }
  /**
   * 添加新任务到控制器
   * @param task 要执行的任务函数
   * @returns 返回一个Promise，当任务执行完成时解决
   */
  addTask(task) {
    return new Promise((resolve, reject) => {
      // 将任务添加到队列
      this.tasks.push({
        task,
        resolve,
        reject,
      });
      // 尝试执行任务
      this.run();
    });
  }
  /**
   * 执行任务的私有方法
   * 根据并发限制和任务队列状态来执行任务
   * @private
   */
  run() {
    // 当有空闲槽位且队列中有待执行任务时，继续执行
    while (
      this.runningCount <= this.accompanyingCount &&
      this.tasks.length > 0
    ) {
      // 从队列中取出一个任务
      const { task, resolve, reject } = this.tasks.shift();
      // 增加运行中的任务计数
      this.runningCount++;
      // 执行任务并处理结果
      new Promise((resolve) => {
        resolve(task());
      })
        .then(resolve, reject)
        .finally(() => {
          // 任务完成后减少计数
          this.runningCount--;
          // 尝试执行下一个任务
          this.run();
        });
    }
  }
}
