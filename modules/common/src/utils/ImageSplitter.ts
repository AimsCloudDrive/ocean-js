/**
 * 图片分割器类 - 用于加载图片并根据配置分割图片
 */
export class ImageSplitter {
  private processedImages: Map<string, string>; // 存储处理后的图片数据 (name -> base64)
  private taskQueue: Array<{
    imageUrl: string;
    configUrl: string;
  }>; // 任务队列
  private isProcessing: boolean; // 标记是否正在处理任务

  /**
   * 构造函数 - 初始化图片分割器
   */
  constructor() {
    this.processedImages = new Map();
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * 添加图片分割任务（链式调用）
   * @param imageUrl - 要分割的图片URL
   * @param configUrl - 分割配置的JSON文件URL
   * @returns 当前实例（支持链式调用）
   */
  add(imageUrl: string, configUrl: string): this {
    this.taskQueue.push({ imageUrl, configUrl });
    if (!this.isProcessing) {
      this.processQueue();
    }
    return this;
  }

  /**
   * 获取分割后的图片base64数据
   * @param name - 配置中定义的图片名称
   * @returns base64图片数据或null（如果不存在）
   */
  get(name: string): string | null {
    if (this.processedImages.has(name)) {
      return this.processedImages.get(name) as string;
    }
    console.warn(`[ImageSplitter] 图片名称 "${name}" 不存在`);
    return null;
  }

  /**
   * 处理任务队列（私有方法）
   */
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.taskQueue.shift()!;

    try {
      // 并行加载图片和配置
      const [image, config] = await Promise.all([
        this.loadImage(task.imageUrl),
        this.fetchConfig(task.configUrl),
      ]);

      // 处理每个分割区域
      for (const [name, region] of Object.entries(config)) {
        if (this.processedImages.has(name)) {
          console.warn(`[ImageSplitter] 名称冲突: "${name}" 已存在，跳过`);
          continue;
        }

        const base64 = this.cropImage(image, region);
        this.processedImages.set(name, base64);
      }
    } catch (error) {
      console.error("[ImageSplitter] 处理任务失败:", error);
    }

    // 递归处理下一个任务
    this.processQueue();
  }

  /**
   * 加载图片（私有方法）
   * @param url - 图片URL
   * @returns 加载完成的Image对象
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // 处理跨域问题
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`图片加载失败: ${url}`));
      img.src = url;
    });
  }

  /**
   * 获取配置（私有方法）
   * @param url - 配置JSON的URL
   * @returns 解析后的配置对象
   */
  private async fetchConfig(
    url: string
  ): Promise<
    Record<string, { x: number; y: number; width: number; height: number }>
  > {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`配置加载失败: ${url}`);
    return response.json();
  }

  /**
   * 裁剪图片（私有方法）
   * @param image - 原始图片对象
   * @param region - 裁剪区域 { x, y, width, height }
   * @returns base64格式的图片数据
   */
  private cropImage(
    image: HTMLImageElement,
    region: { x: number; y: number; width: number; height: number }
  ): string {
    const canvas = document.createElement("canvas");
    canvas.width = region.width;
    canvas.height = region.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取canvas上下文");

    ctx.drawImage(
      image,
      region.x,
      region.y,
      region.width,
      region.height, // 源图裁剪区域
      0,
      0,
      region.width,
      region.height // 画布绘制区域
    );

    return canvas.toDataURL("image/png");
  }
}
