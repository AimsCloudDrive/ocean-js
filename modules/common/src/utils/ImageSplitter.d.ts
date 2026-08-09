/**
 * 图片分割器类 - 用于加载图片并根据配置分割图片
 */
export declare class ImageSplitter {
    private processedImages;
    private taskQueue;
    private isProcessing;
    /**
     * 构造函数 - 初始化图片分割器
     */
    constructor();
    /**
     * 添加图片分割任务（链式调用）
     * @param imageUrl - 要分割的图片URL
     * @param configUrl - 分割配置的JSON文件URL
     * @returns 当前实例（支持链式调用）
     */
    add(imageUrl: string, configUrl: string): this;
    /**
     * 获取分割后的图片base64数据
     * @param name - 配置中定义的图片名称
     * @returns base64图片数据或null（如果不存在）
     */
    get(name: string): string | null;
    /**
     * 处理任务队列（私有方法）
     */
    private processQueue;
    /**
     * 加载图片（私有方法）
     * @param url - 图片URL
     * @returns 加载完成的Image对象
     */
    private loadImage;
    /**
     * 获取配置（私有方法）
     * @param url - 配置JSON的URL
     * @returns 解析后的配置对象
     */
    private fetchConfig;
    /**
     * 裁剪图片（私有方法）
     * @param image - 原始图片对象
     * @param region - 裁剪区域 { x, y, width, height }
     * @returns base64格式的图片数据
     */
    private cropImage;
}
