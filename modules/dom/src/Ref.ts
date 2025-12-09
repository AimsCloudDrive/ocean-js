import { observer } from "@msom/reaction";

export interface IRef<T> {
  set(el: T): void;
  clear(): void;
}

export class Ref<T> implements IRef<T> {
  @observer()
  declare data: T[];

  set(el: T) {
    if (this.data) {
      const index = this.data.indexOf(el);
      if (index === -1) {
        this.data.push(el);
      } else {
        this.data.splice(index, 1);
        this.data.push(el);
      }
    } else {
      this.data = [];
      this.set(el);
    }
  }
  get(index: number): T {
    return this.data?.[index];
  }
  clear() {
    this.data.length = 0;
  }
}
export function createRef<T>(): Ref<T> {
  return new Ref();
}

export class MapRef<T> implements IRef<T> {
  @observer({ deep: true })
  declare data: Map<any, T>;
  set(el: T) {
    if (this.data) {
      this.data.set(
        (el as unknown as { $key: string | number }).$key || el,
        el
      );
    } else {
      this.data = new Map();
      this.set(el);
    }
  }
  get(key: string | number) {
    return this.data?.get(key);
  }
  clear() {
    this.data.clear();
  }
}
export function createMapRef<T>(): MapRef<T> {
  return new MapRef();
}

export class SingleRef<T> implements IRef<T> {
  @observer()
  declare data: T;
  current: T;
  set(el: T) {
    this.current = el;
    this.data = el;
  }
  clear() {
    this.data = undefined as T;
    this.current = undefined as T;
  }
}
export function createSingleRef<T>(): SingleRef<T> {
  return new SingleRef();
}
