import { IComponent } from "./IComponent";

const LIFECYCLE_SYMBOL = Symbol("lifecycle");

interface LifecycleState {
  created: boolean;
  setup: boolean;
  mounted: boolean;
  rendered: boolean;
}

export class LifecycleManager {
  private static instance: LifecycleManager;
  private states = new WeakMap<IComponent, LifecycleState>();
  
  static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager();
    }
    return LifecycleManager.instance;
  }
  
  initLifecycle(component: IComponent): void {
    this.states.set(component, {
      created: false,
      setup: false,
      mounted: false,
      rendered: false
    });
  }
  
  markCreated(component: IComponent): void {
    const state = this.states.get(component);
    if (state) {
      state.created = true;
    }
  }
  
  markSetup(component: IComponent): void {
    const state = this.states.get(component);
    if (state) {
      state.setup = true;
    }
  }
  
  markMounted(component: IComponent): void {
    const state = this.states.get(component);
    if (state) {
      state.mounted = true;
    }
  }
  
  markRendered(component: IComponent): void {
    const state = this.states.get(component);
    if (state) {
      state.rendered = true;
    }
  }
  
  isCreated(component: IComponent): boolean {
    return this.states.get(component)?.created ?? false;
  }
  
  isSetup(component: IComponent): boolean {
    return this.states.get(component)?.setup ?? false;
  }
  
  isMounted(component: IComponent): boolean {
    return this.states.get(component)?.mounted ?? false;
  }
  
  isRendered(component: IComponent): boolean {
    return this.states.get(component)?.rendered ?? false;
  }
  
  hasCalled(component: IComponent, lifecycle: keyof LifecycleState): boolean {
    return this.states.get(component)?.[lifecycle] ?? false;
  }
  
  reset(component: IComponent): void {
    this.states.delete(component);
  }
}

export const lifecycleManager = LifecycleManager.getInstance();
