import { Nullable, createFunction } from "../../global";
import { OcPromiseRejectError } from "./OcPromiseError";

export interface PromiseLike<R> {
  then<TR = R, TE = never>(
    onfulfilled?: Nullable | createFunction<[R, TR | PromiseLike<TR>]>,
    onrejected?: Nullable | createFunction<[any, TE | PromiseLike<TE>]>
  ): PromiseLike<TR | TE>;
}

export interface OcPromiseLike<R> extends PromiseLike<R> {
  then<TR = R, TE = never, TC = never>(
    onfulfilled?:
      | Nullable
      | createFunction<[R, OcPromiseLike<TR> | PromiseLike<TR> | TR]>,
    onrejected?:
      | Nullable
      | createFunction<[any, OcPromiseLike<TE> | PromiseLike<TE> | TE]>,
    oncanceled?:
      | Nullable
      | createFunction<[any, OcPromiseLike<TC> | PromiseLike<TC> | TC]>
  ): OcPromiseLike<TR | TE | TC>;
  cancel(reason?: any): void;
}

export type H<T> = T extends Nullable ? never : ThenableReturnType<T>;

export type ThenableReturnType<T> = T extends (...args: unknown[]) => infer R
  ? R extends PromiseLike<infer PR>
    ? PR
    : R
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
