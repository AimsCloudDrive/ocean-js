import { IObserver, Reaction } from "../Reaction";
export type ObserverOption<T> = {
    initValue?: T;
    equal?: (oldValue: T, newValue: T) => boolean;
    deep?: boolean;
};
export declare class Observer<T = unknown> implements IObserver {
    private destroyed;
    private handlers;
    private value;
    private equal;
    private $option;
    constructor(option?: ObserverOption<T>);
    track(): void;
    private reactiveValue;
    get(): T;
    set(newValue: T): void;
    notify(): void;
    addReaction(reaction: Reaction): void;
    removeReaction(reaction: Reaction): void;
    destroy(): void;
}
export declare function reactive<T extends object>(target: T): T;
