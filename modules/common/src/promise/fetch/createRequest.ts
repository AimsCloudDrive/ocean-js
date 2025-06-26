import { OcPromise, Resolve } from "../OcPromise";

type FetchParameters = [
  Parameters<typeof fetch>[0],
  Exclude<Parameters<typeof fetch>[1], undefined>
];

export function createCancelRequest(...[url, init]: FetchParameters) {
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

/**
 * 创建请求体是application/json的请求
 * @param url
 * @param init
 * @returns
 */
export function createJsonRequest(
  url: FetchParameters[0],
  init?: Omit<FetchParameters[1], "headers"> & {
    headers: JsonRequestHeaders;
  }
) {
  const headers = new Headers(init?.headers);
  headers.delete("content-type");
  headers.append("content-type", "application/json");
  return createCancelRequest(url, { ...(init || {}), headers });
}

function json(response: OcPromise<Response>) {
  return response.then((res) => res.json());
}

/**
 * 创建响应体是json格式的请求
 * @param url
 * @param init
 * @returns
 */
export function createRequestJson(...[url, init]: FetchParameters) {
  return json(createCancelRequest(url, init));
}
/**
 * 创建请求体是application/json、响应体是json格式的请求
 * @param url
 * @param init
 * @returns
 */
export function createJsonRequestJson(
  url: FetchParameters[0],
  options?: Omit<FetchParameters[1], "headers"> & {
    headers: JsonRequestHeaders;
  }
) {
  return json(createJsonRequest(url, options));
}

createJsonRequestJson("", {
  headers: {
    "content-type": "",
  },
});
