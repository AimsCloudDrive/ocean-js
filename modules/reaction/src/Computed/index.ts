import { getGlobalData } from "@msom/common";
import { IObserver, Reaction, $REACTION, createReaction } from "../Reaction";

export type ComputedOption<T> = {
  method: () => T;
  equal?: (oldValue: T, newValue: T) => boolean;
};

export class Computed<T extends unknown = unknown> implements IObserver {
  private declare dirty: boolean;
  private declare cache: T;
  private declare handles: Set<Reaction>;
  private declare equal: (oldValue: T, newValue: T) => boolean;
  private declare method: () => T;
  private declare subReaction: Reaction | undefined;
  constructor(props: ComputedOption<T>) {
    Object.assign(this, props);
    this.dirty = true;
  }
  track() {
    const running = getGlobalData("@msom/reaction") as $REACTION;
    if (running?.tracking) {
      running.tracking(this);
    }
  }

  get(): T {
    this.track();
    if (!this.dirty && typeof this.cache !== undefined) {
      return this.cache;
    } else {
      this.compute();
      return this.cache;
    }
  }

  private compute() {
    const { method } = this;
    if (!method) {
      return;
    }
    this.subReaction?.destroy();
    // 将运行method收集到的依赖和computed的响应关联
    this.subReaction = createReaction(
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
    this.dirty = true;
    this.subReaction?.destroy();
    this.subReaction = undefined;
    this.handles.forEach((reaction) => {
      reaction.removeObserver(this);
    });
  }
}
