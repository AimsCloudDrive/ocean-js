import { observer } from "../Decorator/observer";

export interface IRef<T> {
  set(el: T): void;
}

export class Ref<T> implements IRef<T> {
  @observer()
  data: T[];

  set(el: T) {
    if (this.data) {
      this.data.push(el);
    } else {
      this.data = [];
      this.set(el);
    }
  }
  get(index: number): T {
    return this.data?.[index];
  }
}
export function createRef<T>(): Ref<T> {
  return new Ref();
}

export class MapRef<T> implements IRef<T> {
  @observer()
  data: Map<string | number, T>;
  set(el: T) {
    if (this.data) {
      this.data.set((el as unknown as { $key: string | number }).$key, el);
    } else {
      this.data = new Map();
      this.set(el);
    }
  }
  get(key: string | number) {
    return this.data?.get(key);
  }
}
export function createMapRef<T>(): MapRef<T> {
  return new MapRef();
}

export class SingleRef<T> implements IRef<T> {
  @observer()
  data: T;
  current: T;
  set(el: T) {
    this.current = el;
    this.data = el;
  }
}
export function createSingleRef<T>(): SingleRef<T> {
  return new SingleRef();
}
