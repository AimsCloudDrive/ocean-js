export interface IEvent<E extends object = object> {
    on<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    once<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    un<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    emit<T extends keyof E>(type: T, event: E[T]): void;
}
export interface Handler<E extends object = object, T extends keyof E = keyof E, Self extends IEvent<E> = IEvent<E>> {
    (event: E[T], type: T, self: Self): void;
}
export declare class Event<E extends object = object> implements IEvent<E> {
    constructor();
    on<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    once<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    un<T extends keyof E>(type: T, handler: Handler<E, T, IEvent<E>>): this;
    emit<T extends keyof E>(type: T, event: E[T]): void;
}
export declare function clearEvent(target: Event<any>): boolean;
