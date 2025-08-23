import { ComponentState } from "./Component";

/**
 * 状态管理器符号
 */
export const STATE_MANAGER_SYMBOL = Symbol("stateManager");

/**
 * 快照管理器符号
 */
export const SNAPSHOT_MANAGER_SYMBOL = Symbol("snapshotManager");

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
export class SnapshotManager {
  private snapshots: ComponentSnapshot[] = [];
  private nextId: number = 1;

  /**
   * 创建快照
   * @param data 快照数据
   * @param description 快照描述
   * @returns 快照ID
   */
  createSnapshot(data: any, description?: string): number {
    const snapshot: ComponentSnapshot = {
      id: this.nextId++,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      description,
    };
    this.snapshots.push(snapshot);
    return snapshot.id;
  }

  /**
   * 获取所有快照
   * @returns 快照数组
   */
  getSnapshots(): ComponentSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取指定快照
   * @param id 快照ID
   * @returns 快照或null
   */
  getSnapshot(id: number): ComponentSnapshot | null {
    return this.snapshots.find((s) => s.id === id) || null;
  }

  /**
   * 获取最新快照
   * @returns 最新快照或null
   */
  getLatestSnapshot(): ComponentSnapshot | null {
    return this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1]
      : null;
  }

  /**
   * 删除快照
   * @param id 快照ID
   * @returns 是否删除成功
   */
  deleteSnapshot(id: number): boolean {
    const index = this.snapshots.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.snapshots.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清空所有快照
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * 获取快照数量
   * @returns 快照数量
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}

/**
 * 组件状态管理器
 */
export class ComponentStateManager {
  private state: ComponentState = ComponentState.CREATED;
  private stateChangeCallbacks: Map<ComponentState, (() => void)[]> = new Map();

  /**
   * 获取当前状态
   */
  getState(): ComponentState {
    return this.state;
  }

  /**
   * 设置状态
   */
  setState(newState: ComponentState): void {
    const oldState = this.state;
    this.state = newState;

    // 触发状态变更回调
    const callbacks = this.stateChangeCallbacks.get(newState);
    if (callbacks) {
      callbacks.forEach((callback) => callback());
    }
  }

  /**
   * 检查是否为指定状态
   */
  isState(state: ComponentState): boolean {
    return this.state === state;
  }

  /**
   * 检查是否为指定状态之一
   */
  isAnyState(states: ComponentState[]): boolean {
    return states.includes(this.state);
  }

  /**
   * 添加状态变更监听器
   */
  onStateChange(state: ComponentState, callback: () => void): void {
    if (!this.stateChangeCallbacks.has(state)) {
      this.stateChangeCallbacks.set(state, []);
    }
    this.stateChangeCallbacks.get(state)!.push(callback);
  }

  /**
   * 移除状态变更监听器
   */
  offStateChange(state: ComponentState, callback: () => void): void {
    const callbacks = this.stateChangeCallbacks.get(state);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

/**
 * 公共状态检查方法
 */
export function isComponentState(
  component: any,
  state: ComponentState
): boolean {
  return component?.[STATE_MANAGER_SYMBOL]?.isState(state) || false;
}

export function isComponentAnyState(
  component: any,
  states: ComponentState[]
): boolean {
  return component?.[STATE_MANAGER_SYMBOL]?.isAnyState(states) || false;
}

export function getComponentState(component: any): ComponentState | null {
  return component?.[STATE_MANAGER_SYMBOL]?.getState() || null;
}

export function setComponentState(component: any, state: ComponentState): void {
  component?.[STATE_MANAGER_SYMBOL]?.setState(state);
}

/**
 * 检查组件是否已挂载
 */
export function isComponentMounted(component: any): boolean {
  return isComponentState(component, ComponentState.MOUNTED);
}

/**
 * 检查组件是否已销毁
 */
export function isComponentDestroyed(component: any): boolean {
  return isComponentState(component, ComponentState.DESTROYED);
}

/**
 * 公共快照管理方法
 */
export function createComponentSnapshot(
  component: any,
  data: any,
  description?: string
): number {
  return (
    component?.[SNAPSHOT_MANAGER_SYMBOL]?.createSnapshot(data, description) ||
    -1
  );
}

export function getComponentSnapshots(component: any): ComponentSnapshot[] {
  return component?.[SNAPSHOT_MANAGER_SYMBOL]?.getSnapshots() || [];
}

export function getComponentSnapshot(
  component: any,
  id: number
): ComponentSnapshot | null {
  return component?.[SNAPSHOT_MANAGER_SYMBOL]?.getSnapshot(id) || null;
}

export function getComponentLatestSnapshot(
  component: any
): ComponentSnapshot | null {
  return component?.[SNAPSHOT_MANAGER_SYMBOL]?.getLatestSnapshot() || null;
}

export function deleteComponentSnapshot(component: any, id: number): boolean {
  return component?.[SNAPSHOT_MANAGER_SYMBOL]?.deleteSnapshot(id) || false;
}

export function clearComponentSnapshots(component: any): void {
  component?.[SNAPSHOT_MANAGER_SYMBOL]?.clearSnapshots();
}

export function getComponentSnapshotCount(component: any): number {
  return component?.[SNAPSHOT_MANAGER_SYMBOL]?.getSnapshotCount() || 0;
}
