/**
 * VNode管理工具
 * 提供组件VNode的存储、获取和设置功能
 */

// 定义VNode存储的符号属性
const VNODE_SYMBOL = Symbol("vnode");

/**
 * VNodeWithDOM接口定义
 * 带有真实DOM元素的VNode类型
 */
export interface VNodeWithDOM {
  /** 关联的真实DOM元素 */
  _dom?: HTMLElement | Text;
  /** 事件绑定映射 */
  _events?: Map<string, EventListener>;
  /** VNode类型 */
  type: any;
  /** VNode属性 */
  props: any;
  /** 其他可能的属性 */
  [key: string]: any;
}

/**
 * 获取组件的VNode
 * @param component 组件实例
 * @returns 组件的VNodeWithDOM或null
 */
export function getComponentVNode(component: any): VNodeWithDOM | null {
  return (component as any)[VNODE_SYMBOL] || null;
}

/**
 * 设置组件的VNode
 * @param component 组件实例
 * @param vnode VNodeWithDOM或null
 */
export function setComponentVNode(
  component: any,
  vnode: VNodeWithDOM | null
): void {
  (component as any)[VNODE_SYMBOL] = vnode;
}

/**
 * 检查组件是否有VNode
 * @param component 组件实例
 * @returns 是否有VNode
 */
export function hasComponentVNode(component: any): boolean {
  return (component as any)[VNODE_SYMBOL] !== undefined;
}

/**
 * 清除组件的VNode
 * @param component 组件实例
 */
export function clearComponentVNode(component: any): void {
  delete (component as any)[VNODE_SYMBOL];
}

/**
 * 获取VNode符号属性名（用于调试）
 * @returns VNode符号属性名
 */
export function getVNodeSymbol(): symbol {
  return VNODE_SYMBOL;
}
