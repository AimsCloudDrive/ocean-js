import { Computed, ComputedOption } from "./Computed";
import { Observer, ObserverOption } from "./Observer";
import { IObserver } from "./Reaction";
export declare function getObserver(this: any, key: PropertyKey): IObserver | undefined;
export declare const _observer = "observer";
export declare const _computed = "computed";
declare const observerTypeMap: {
    readonly observer: typeof Observer;
    readonly computed: typeof Computed;
};
export declare function generateIObserver<T, K extends keyof typeof observerTypeMap>(this: any, key: PropertyKey, type: K, option: K extends typeof _observer ? ObserverOption<T> : ComputedOption<T>): K extends typeof _observer ? Observer<T> : Computed<T>;
export {};
