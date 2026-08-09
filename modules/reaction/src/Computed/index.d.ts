import { IObserver, Reaction } from "../Reaction";
export type ComputedOption<T> = {
    method: () => T;
    equal?: (oldValue: T, newValue: T) => boolean;
};
export declare class Computed<T extends unknown = unknown> implements IObserver {
    private dirty;
    private cache;
    private handles;
    private equal;
    private method;
    private subReaction;
    constructor(props: ComputedOption<T>);
    track(): void;
    get(): T;
    private compute;
    notify(): void;
    addReaction(reaction: Reaction): void;
    removeReaction(reaction: Reaction): void;
    destroy(): void;
}
