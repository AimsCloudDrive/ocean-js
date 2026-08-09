import { ComponentState } from "./Component";
/**
 * 状态管理器符号
 */
export declare const STATE_MANAGER_SYMBOL: unique symbol;
/**
 * 快照管理器符号
 */
export declare const SNAPSHOT_MANAGER_SYMBOL: unique symbol;
/**
 * 快照接口
 */
export interface ComponentSnapshot {
    id: number;
    timestamp: number;
    data: any;
    description?: string;
}
/**
 * 快照管理器
 */
export declare class SnapshotManager {
    private snapshots;
    private nextId;
    /**
     * 创建快照
     * @param data 快照数据
     * @param description 快照描述
     * @returns 快照ID
     */
    createSnapshot(data: any, description?: string): number;
    /**
     * 获取所有快照
     * @returns 快照数组
     */
    getSnapshots(): ComponentSnapshot[];
    /**
     * 获取指定快照
     * @param id 快照ID
     * @returns 快照或null
     */
    getSnapshot(id: number): ComponentSnapshot | null;
    /**
     * 获取最新快照
     * @returns 最新快照或null
     */
    getLatestSnapshot(): ComponentSnapshot | null;
    /**
     * 删除快照
     * @param id 快照ID
     * @returns 是否删除成功
     */
    deleteSnapshot(id: number): boolean;
    /**
     * 清空所有快照
     */
    clearSnapshots(): void;
    /**
     * 获取快照数量
     * @returns 快照数量
     */
    getSnapshotCount(): number;
}
/**
 * 组件状态管理器
 */
export declare class ComponentStateManager {
    private state;
    private stateChangeCallbacks;
    /**
     * 获取当前状态
     */
    getState(): ComponentState;
    /**
     * 设置状态
     */
    setState(newState: ComponentState): void;
    /**
     * 检查是否为指定状态
     */
    isState(state: ComponentState): boolean;
    /**
     * 检查是否为指定状态之一
     */
    isAnyState(states: ComponentState[]): boolean;
    /**
     * 添加状态变更监听器
     */
    onStateChange(state: ComponentState, callback: () => void): void;
    /**
     * 移除状态变更监听器
     */
    offStateChange(state: ComponentState, callback: () => void): void;
}
/**
 * 公共状态检查方法
 */
export declare function isComponentState(component: any, state: ComponentState): boolean;
export declare function isComponentAnyState(component: any, states: ComponentState[]): boolean;
export declare function getComponentState(component: any): ComponentState | null;
export declare function setComponentState(component: any, state: ComponentState): void;
/**
 * 检查组件是否已挂载
 */
export declare function isComponentMounted(component: any): boolean;
/**
 * 检查组件是否已销毁
 */
export declare function isComponentDestroyed(component: any): boolean;
/**
 * 公共快照管理方法
 */
export declare function createComponentSnapshot(component: any, data: any, description?: string): number;
export declare function getComponentSnapshots(component: any): ComponentSnapshot[];
export declare function getComponentSnapshot(component: any, id: number): ComponentSnapshot | null;
export declare function getComponentLatestSnapshot(component: any): ComponentSnapshot | null;
export declare function deleteComponentSnapshot(component: any, id: number): boolean;
export declare function clearComponentSnapshots(component: any): void;
export declare function getComponentSnapshotCount(component: any): number;
