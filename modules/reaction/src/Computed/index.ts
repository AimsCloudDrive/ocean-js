import { getGlobalData } from "@ocean/common";
import { IObserver, Reaction, $REACTION, createReaction } from "../Reaction";

export type ComputedOption<T> = {
  method: () => T;
  equal?: (oldValue: T, newValue: T) => boolean;
};

export class Computed<T extends unknown = unknown> implements IObserver {
  declare dirty: boolean;
  private declare cache: T;
  private declare handles: Set<Reaction>;
  private declare equal: (oldValue: T, newValue: T) => boolean;
  private declare method: () => T;
  private declare loaded: Reaction | undefined;
  constructor(props: ComputedOption<T>) {
    Object.assign(this, props);
    this.dirty = false;
  }
  track() {
    const running = getGlobalData("@ocean/reaction") as $REACTION;
    if (running?.tracking) {
      running.tracking(this);
    }
  }

  get(): T {
    this.track();
    // 首次运行数据未脏但缓存没值
    if (!this.dirty && this.loaded) {
      return this.cache;
    } else {
      this.load();
      return this.cache;
    }
  }

  private load() {
    const { method } = this;
    this.loaded?.destroy();
    // 将运行method收集到的依赖和computed的响应关联
    this.loaded = createReaction(
      () => {
        this.cache = method();
        this.dirty = false;
      },
      () => {
        this.notify();
      }
    );
  }

  notify(): void {
    this.dirty = true;
    const handles = [...this.handles];
    for (const reaction of handles) {
      reaction.notify();
    }
  }
  addReaction(reaction: Reaction): void {
    this.handles.add(reaction);
  }
  removeReaction(reaction: Reaction): void {
    this.handles.delete(reaction);
  }
  destroy() {
    this.dirty = false;
    this.loaded = undefined;
    this.handles.forEach((reaction) => {
      reaction.removeObserver(this);
    });
  }
}
