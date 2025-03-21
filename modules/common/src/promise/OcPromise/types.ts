import { Nullable, createFunction } from "../../global";
import { OcPromiseRejectError } from "./OcPromiseError";

export interface thenable<R, E extends Error | unknown = Error> {
  then<
    TR extends Nullable | createFunction<[R, unknown]>,
    TE extends Nullable | createFunction<[E, unknown]>,
    FR = ReturnTypeNotUndeF<TR | TE>
  >(
    onfulfilled: TR,
    onrejected: TE
  ): thenable<FR, Error | unknown>;
  cancel?(): void;
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

export type Resolve<R> = (data: R | thenable<R>) => void;
export type Reject<E extends Error | unknown = OcPromiseRejectError> = (
  reason: E
) => void;
export type Cancel<C> = (reason: C) => void;

export type OcPromiseExecutor<
  R,
  E extends Error | unknown = Error,
  C = unknown
> = createFunction<[Resolve<R>, Reject<E>, Cancel<C>, void]>;
