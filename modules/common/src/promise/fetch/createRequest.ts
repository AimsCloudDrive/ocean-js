import { OcPromise } from "../OcPromise";
export function createRequest(...[url, option]: Parameters<typeof fetch>) {
  const controller = new AbortController();
  option = option || {};
  if (option.signal) {
    option.signal.addEventListener("abort", () => controller.abort());
  }
  option.signal = controller.signal;
  const promise = new OcPromise<Promise<any>>((resolve, reject) => {
    fetch(url, option).then((data) => {
      resolve(data.json());
    }, reject);
  });
  promise.canceled(() => controller.abort());
  return promise;
}
