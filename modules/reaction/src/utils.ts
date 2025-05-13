import { Computed, ComputedOption } from "./Computed";
import { Observer, ObserverOption } from "./Observer";
import { IObserver } from "./Reaction";

const observerMapSymbolKey = Symbol("observerMapSymbolKey");
export function getObserver(this: any, key: PropertyKey) {
  const observersMap: Map<PropertyKey, IObserver> = Reflect.get(
    this,
    observerMapSymbolKey,
    this
  );
  if (!observersMap) {
    return;
  }
  const observer = observersMap.get(key);
  if (!observer) {
    return;
  }
  return observer as IObserver;
}

export const _observer = "observer";
export const _computed = "computed";

const observerTypeMap = {
  [_observer]: Observer,
  [_computed]: Computed,
} as const;

export function generateIObserver<T, K extends keyof typeof observerTypeMap>(
  this: any,
  key: PropertyKey,
  type: K,
  option: K extends typeof _observer ? ObserverOption<T> : ComputedOption<T>
): K extends typeof _observer ? Observer<T> : Computed<T> {
  // 继承对象的监听器也存在当前对象
  const observersMap: Map<PropertyKey, IObserver> =
    Reflect.get(this, observerMapSymbolKey, this) || new Map();
  Reflect.set(this, key, observersMap, this);
  const observer =
    observersMap.get(key) ||
    new observerTypeMap[type](option as ObserverOption<T> & ComputedOption<T>);
  observersMap.set(key, observer);
  return observer as Observer<T> & Computed<T>;
}
