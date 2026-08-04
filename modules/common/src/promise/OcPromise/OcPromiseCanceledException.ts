export class OcPromiseCanceledException<T = never> extends Error {
  constructor(reason?: T) {
    super(`OcPromise Canceled: ${reason}`);
    this.name = "OcPromiseCanceledException";
  }
}
export const isOcPromiseCanceledException = <T>(e: any): e is OcPromiseCanceledException<T> =>
  e instanceof OcPromiseCanceledException;

export const formatOcPromiseCanceledException = <T>(e: any): OcPromiseCanceledException<T> => {
  if (isOcPromiseCanceledException(e)) {
    return e;
  }
  return new OcPromiseCanceledException(e);
};
