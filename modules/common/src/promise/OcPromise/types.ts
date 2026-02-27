import { Nullable, createFunction } from "../../global";

export interface PromiseLike<R = any, E = any> {
  then<TR = R, TE = E>(
    onfulfilled?: Nullable | createFunction<[R, TR]>,
    onrejected?: Nullable | createFunction<[E, TE]>,
  ): PromiseLike<InferResultR<TR, TE>, InferResultE<TR, TE>>;
}

export interface OcPromiseLike<R = any, E = any, C = any> extends PromiseLike<
  R,
  E
> {
  then<TR = R, TE = E, TC = C>(
    onfulfilled?: Nullable | createFunction<[R, TR]>,
    onrejected?: Nullable | createFunction<[E, TE]>,
    oncanceled?: Nullable | createFunction<[C, TC]>,
  ): OcPromiseLike<
    InferResultR<TR, TE, TC>,
    InferResultE<TR, TE, TC>,
    InferResultC<TR, TE, TC>
  >;
  cancel(reason?: any, cascade?: boolean): void;
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

export type Resolve<R> = (data: R | PromiseLike<R>) => void;
export type Reject<E extends Error | unknown = unknown> = (reason: E) => void;
export type Cancel<C> = (reason: C) => void;

export type OcPromiseExecutor<
  R,
  E extends Error | unknown = Error,
  C = unknown,
> = createFunction<[Resolve<R>, Reject<E>, Cancel<C>, void]>;

export type InferResultR<TR = never, TE = never, TC = never> =
  | (TR extends PromiseLike<infer R, any>
      ? R
      : TR extends Promise<infer R>
        ? R
        : TR)
  | (TE extends PromiseLike<infer R, any>
      ? R
      : TE extends Promise<infer R>
        ? R
        : TE)
  | (TC extends PromiseLike<infer R, any>
      ? R
      : TC extends Promise<infer R>
        ? R
        : TC);

export type InferResultE<TR = never, TE = never, TC = never> =
  | (TR extends PromiseLike<any, infer E>
      ? E
      : TR extends Promise<infer E>
        ? E
        : never)
  | (TE extends PromiseLike<any, infer E>
      ? E
      : TE extends Promise<infer E>
        ? E
        : never)
  | (TC extends PromiseLike<any, infer E>
      ? E
      : TC extends Promise<infer E>
        ? E
        : never);

export type InferResultC<TR = never, TE = never, TC = never> =
  | (TR extends OcPromiseLike<any, any, infer C> ? C : never)
  | (TE extends OcPromiseLike<any, any, infer C> ? C : never)
  | (TC extends OcPromiseLike<any, any, infer C> ? C : never);
