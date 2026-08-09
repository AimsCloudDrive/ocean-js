import { OcPromiseLike, PromiseLike } from "./types";
export declare function isPromiseLike<R = any, E = any>(data: unknown): data is PromiseLike<R, E>;
export declare function isOcPromiseLike<R = any, E = any, C = any>(data: unknown): data is OcPromiseLike<R, E, C>;
