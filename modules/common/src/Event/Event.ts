import { defineProperty } from "../global";
import { EVENTS } from "./context";

const EK = EVENTS;

export interface IEvent<E extends object = object> {
  on<T extends keyof E>(
    type: T,
    handler: (event: E[T], type: T, self: Event<E>) => void
  ): this;
  un<T extends keyof E>(
    type: T,
    handler: (event: E[T], type: T, self: Event<E>) => void
  ): this;
  emit<T extends keyof E>(type: T, event: E[T]): void;
}

type EVS<E extends object = object> = {
  [K in keyof E]: ((event: E[K], type: K, self: Event<E>) => void)[];
};

export class Event<E extends object = object> implements IEvent<E> {
  constructor() {
    defineProperty(this, EK, 0, Object.create(null));
  }
  on<T extends keyof E>(
    type: T,
    handler: (event: E[T], type: T, self: Event<E>) => void
  ) {
    const _events = this[EK as keyof this] as EVS<E>;
    let handlers = _events[type];
    if (!handlers) {
      handlers = _events[type] = [];
    }
    handlers.push(handler);
    return this;
  }
  un<T extends keyof E>(
    type: T,
    handler: (event: E[T], type: T, self: Event<E>) => void
  ) {
    const _events = this[EK as keyof this] as EVS<E>;
    const handlers = _events[type];
    if (!handlers) {
      return this;
    }
    const index = handlers.findIndex((_handler) => handler === _handler);
    if (index === -1) return this;
    handlers.splice(index, 1);
    return this;
  }
  emit<T extends keyof E>(type: T, event: E[T]) {
    const _events = this[EK as keyof this] as EVS<E>;
    const handlers = _events[type];
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => handler(event, type, this));
  }
}
