export declare class OcPromiseCanceledException<T = never> extends Error {
    constructor(reason?: T);
}
export declare const isOcPromiseCanceledException: <T>(e: any) => e is OcPromiseCanceledException<T>;
export declare const formatOcPromiseCanceledException: <T>(e: any) => OcPromiseCanceledException<T>;
