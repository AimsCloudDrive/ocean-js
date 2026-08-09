export interface IObserver {
    notify(): void;
    addReaction(reaction: Reaction): void;
    removeReaction(reaction: Reaction): void;
}
export type $REACTION = {
    tracking?: (ob: IObserver) => void;
    reaction?: Reaction;
};
export type ReactionOption = {
    tracker: () => void;
    callback?: () => void;
    scheduler?: "nextTick" | "nextFrame" | undefined | ((cb: () => void) => void);
};
export declare class Reaction {
    private option;
    private tracked;
    private cancel?;
    constructor(option: ReactionOption);
    private _cancel;
    /**
     * 根据传入的delay选项，初始化微队列函数
     * @returns
     */
    updateNextTick(): void;
    nextTick(cb: () => void): void;
    track(): void;
    notify(): void;
    exec(): this;
    private runcall;
    disposer(): () => void;
    destroy(): void;
    addObserver(observer: IObserver): void;
    removeObserver(observer: IObserver): void;
}
export declare function createReaction(tracker: () => void, callback: () => void, option?: {
    scheduler?: ReactionOption["scheduler"];
}): Reaction;
export declare function createReaction(tracker: () => void, option?: {
    scheduler?: ReactionOption["scheduler"];
}): Reaction;
export declare function withoutTrack<T>(callback: () => T): T;
