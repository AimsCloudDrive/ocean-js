/** 模型节点类型 */
export interface ModelNode<T = unknown> {
  /** 节点唯一标识 */
  id: string;
  /** 节点名称 */
  name: string;
  /** 节点数据 */
  data?: T;
}

/** 模型设计器面板配置 */
export interface ModelDesignerOption {
  /** 面板标题 */
  title?: string;
  /** 容器类名 */
  className?: string;
}
