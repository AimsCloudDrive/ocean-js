import { OcPromise, Resolve } from "../OcPromise";

type FetchUrl = Parameters<typeof fetch>[0];
type FetchOption = Parameters<typeof fetch>[1];

export function createCancelRequest(url: FetchUrl, init?: FetchOption) {
  const controller = new AbortController();
  init = init || {};
  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }
  init.signal = controller.signal;
  const promise = new OcPromise<Response>((resolve, reject) => {
    fetch(url, init).then((data) => {
      resolve(data);
    }, reject);
  });
  promise.canceled(() => controller.abort());
  return promise;
}

type OmitContentType = Exclude<string, "content-type" | "contentType">;

type JsonRequestHeaders =
  | Headers
  | [OmitContentType, string][]
  | Record<OmitContentType, string>;

type JsonRequestOptions = Omit<Exclude<FetchOption, undefined>, "headers"> & {
  headers: JsonRequestHeaders;
};

/**
 * 创建请求体是application/json的请求
 * @param url
 * @param init
 * @returns
 */
export function createJsonRequest(url: FetchUrl, init?: FetchOption) {
  const headers = new Headers(init?.headers);
  headers.delete("content-type");
  headers.append("content-type", "application/json");
  return createCancelRequest(url, { ...(init || {}), headers });
}

function json<T>(response: OcPromise<Response>): OcPromise<T> {
  return response.then((res) => res.json());
}

/**
 * 创建响应体是json格式的请求
 * @param url
 * @param init
 * @returns
 */
export function createRequestJson<T>(url: FetchUrl, init?: FetchOption) {
  return json<T>(createCancelRequest(url, init));
}
/**
 * 创建请求体是application/json、响应体是json格式的请求
 * @param url
 * @param init
 * @returns
 */
export function createJsonRequestJson<T>(url: FetchUrl, init?: FetchOption) {
  return json<T>(createJsonRequest(url, init));
}
