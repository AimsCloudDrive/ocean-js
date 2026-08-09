export declare const iterator: typeof Symbol.iterator;
export type TRACKERTYPES = "GET" | "HAS" | typeof iterator;
export type TRRIGERTYPES = "SET" | "ADD" | "DELETE";
export declare const OPERATORTYPES: {
    TRACKER: {
        [TRACKERTYPE in TRACKERTYPES]: TRACKERTYPE;
    };
    TRRIGER: {
        [TRRIGERTYPE in TRRIGERTYPES]: TRRIGERTYPE;
    };
};
export declare const OPERATORMAPS: {
    readonly SET: readonly ["GET"];
    readonly ADD: readonly ["GET", "HAS", typeof Symbol.iterator];
    readonly DELETE: readonly ["GET", "HAS", typeof Symbol.iterator];
};
