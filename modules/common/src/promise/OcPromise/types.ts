import { createFunction } from "../../global";
import { OcPromiseRejectError } from "./OcPromiseError";

export interface PromiseLike<R, E extends Error | unknown = Error> {
  then<TR, TE = never>(
    onfulfilled?: createFunction<[R, TR | PromiseLike<TR>]>,
    onrejected?: createFunction<[E, TE | PromiseLike<TE>]>
  ): OcPromiseLike<TR | TE, Error | unknown, unknown>;
}

export interface OcPromiseLike<
  R,
  E extends Error | unknown = Error,
  C extends unknown = unknown
> extends PromiseLike<R, E> {
  then<TR, TE = never, TC = never>(
    onfulfilled?: createFunction<[R, TR | PromiseLike<TR>]>,
    onrejected?: createFunction<[E, TE | PromiseLike<TE>]>,
    oncanceled?: createFunction<[C, TC | OcPromiseLike<TC>]>
  ): OcPromiseLike<TR | TE | TC, Error | unknown, unknown>;
  cancel(reason?: C): void;
}

export type ReturnTypeNotUndeF<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;

export const PENDDING = "pendding";
export const FULFILLED = "fulfilled";
export const REJECTED = "rejected";
export const CANCELED = "canceled";

export type Pendding = typeof PENDDING;
export type Fulfilled = typeof FULFILLED;
export type Rejected = typeof REJECTED;
export type Canceled = typeof CANCELED;

export type OcPromiseStatus = Fulfilled | Rejected | Canceled | Pendding;

export type Resolve<R> = (data: R | OcPromiseLike<R>) => void;
export type Reject<E extends Error | unknown = OcPromiseRejectError> = (
  reason: E
) => void;
export type Cancel<C> = (reason: C) => void;

export type OcPromiseExecutor<
  R,
  E extends Error | unknown = Error,
  C = unknown
> = createFunction<[Resolve<R>, Reject<E>, Cancel<C>, void]>;
