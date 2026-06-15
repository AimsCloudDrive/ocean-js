import { defineProperty } from '../global';
import { EVENTS } from './context';
import { Collection } from '../collection';

const EK = EVENTS;

export interface IEvent<E extends object = object> {
  on<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
  once<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
  un<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
  emit<T extends keyof E>(type: T, event: E[T]): void;
}

export interface Handler<E extends object = object, T extends keyof E = keyof E, Self extends IEvent<E> = IEvent<E>> {
  (event: E[T], type: T, self: Self): void;
}

interface IHandler<E extends object = object, T extends keyof E = keyof E, Self extends IEvent<E> = IEvent<E>> {
  identifier: 'handler' | 'onceHandler';
  type: T;
  self: Self;
  handler(...args: Parameters<Handler<E, T, Self>>): void;
  original: Handler<E, T, Self>;
}

interface OnceHandler<
  E extends object = object,
  T extends keyof E = keyof E,
  Self extends IEvent<E> = IEvent<E>,
> extends IHandler<E, T, Self> {
  identifier: 'onceHandler';
}

class NHandlerConstructor<
  E extends object = object,
  T extends keyof E = keyof E,
  Self extends IEvent<E> = IEvent<E>,
> implements IHandler<E, T, Self> {
  identifier: 'handler';
  type: T;
  self: Self;
  constructor(handler: Handler<E, T, Self>, type: T, self: Self) {
    this.identifier = 'handler';
    this.type = type;
    this.self = self;
    this.original = handler;
  }
  handler(...args: Parameters<Handler<E, T, Self>>): void {
    this.original(...args);
  }
  original: Handler<E, T, Self>;
}

class OnceHandlerConstructor<
  E extends object = object,
  T extends keyof E = keyof E,
  Self extends IEvent<E> = IEvent<E>,
> implements IHandler<E, T, Self> {
  identifier: 'onceHandler';
  type: T;
  self: Self;
  index: number;
  static handlesIndex = new WeakMap();
  constructor(handler: Handler<E, T, Self>, type: T, self: Self) {
    this.identifier = 'onceHandler';
    this.type = type;
    this.self = self;
    this.original = handler;
    this.index = OnceHandlerConstructor.handlesIndex.get(handler) || 0;
    OnceHandlerConstructor.handlesIndex.set(handler, this.index + 1);
  }
  handler(...args: Parameters<Handler<E, T, Self>>): void {
    this.original(...args);
    this.self.un(this.type, this.original);
  }
  original: Handler<E, T, Self>;
}

const getHandlerKey = (handler: IHandler<any, any, any>) => {
  return handler.original;
};

type EVS<E extends {} = {}, Self extends IEvent<E> = IEvent<E>> = {
  [K in keyof E]: Collection<IHandler<E, K, Self>>;
};

export class Event<E extends object = object> implements IEvent<E> {
  constructor() {
    defineProperty(this, EK, 0, Object.create(null));
  }
  on<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this {
    const _events = this[EK as keyof this] as EVS<E, Event<E>>;
    let handlers = _events[type];
    if (!handlers) {
      handlers = _events[type] = new Collection(getHandlerKey);
    }
    /**
     * 当已存在时不会重复添加且不会覆盖已存在的处理函数
     */
    handlers.add(new NHandlerConstructor(handler, type, this));
    return this;
  }
  once<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>) {
    const _events = this[EK as keyof this] as EVS<E, Event<E>>;
    let handlers = _events[type];
    if (!handlers) {
      handlers = _events[type] = new Collection(getHandlerKey);
    }
    /**
     * 当已存在时不会重复添加且不会覆盖已存在的处理函数
     */
    handlers.add(new OnceHandlerConstructor(handler, type, this));
    return this;
  }
  un<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>) {
    const _events = this[EK as keyof this] as EVS<E>;
    const handlers = _events[type];
    if (!handlers) {
      return this;
    }
    handlers.remove(handler);
    return this;
  }
  emit<T extends keyof E>(type: T, event: E[T]) {
    const _events = this[EK as keyof this] as EVS<E>;
    const handlers = _events[type];
    if (!handlers) {
      return;
    }
    const handlesCopy = handlers.toArray();
    handlesCopy.forEach((handler) => handler.handler(event, type, this));
  }
}

export function clearEvent(target: Event<any>) {
  if (!target || !(target instanceof Event)) {
    throw 'the target should be Event instance';
  }
  return Reflect.deleteProperty(target, EK);
}
