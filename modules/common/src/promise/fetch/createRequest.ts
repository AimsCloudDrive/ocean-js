import { OcPromise } from "../OcPromise";

type FetchUrl = Parameters<typeof fetch>[0];
type FetchOption = Exclude<Parameters<typeof fetch>[1], undefined> & {
  params?: Record<string, any>;
};

export function createCancelRequest(
  url: FetchUrl,
  fetchInit: FetchOption = {}
) {
  const controller = new AbortController();

  // 信号处理（含内存泄漏防护）
  const signalOption = fetchInit.signal;
  if (signalOption) {
    const handleAbort = () => {
      controller.abort();
      externalSignalCleanup();
    };
    signalOption.addEventListener("abort", handleAbort, { once: true });
    const externalSignalCleanup = () => {
      signalOption.removeEventListener("abort", handleAbort);
    };
  }

  // ========== 关键修复：参数处理 ========== //
  const params = fetchInit.params;
  if (params) {
    const applyParams = (urlObj: URL) => {
      Object.entries(params).forEach(([key, value]) => {
        // 删除已有参数避免重复
        urlObj.searchParams.delete(key);

        // 处理数组参数
        if (Array.isArray(value)) {
          value.forEach(
            (v) => v != null && urlObj.searchParams.append(key, String(v))
          );
        }
        // 处理非空值
        else if (value != null) {
          urlObj.searchParams.set(key, String(value));
        }
      });
    };

    try {
      // 字符串URL处理
      if (typeof url === "string") {
        const baseURL = url.startsWith("/")
          ? window.location.origin
          : undefined;
        const urlObj = new URL(url, baseURL);
        applyParams(urlObj);
        url = urlObj.toString();
      }
      // URL对象处理
      else if (url instanceof URL) {
        applyParams(url); // 直接修改可用的searchParams
      }
      // Request对象处理
      else if (url instanceof Request) {
        const urlObj = new URL(url.url);
        applyParams(urlObj);
        // 创建新Request实例（保持不可变性）
        url = new Request(urlObj.toString(), {
          ...url,
          signal: controller.signal, // 保持信号一致性
        });
      }
    } catch (e) {
      console.error("URL处理错误:", e);
      // 回退原始URL
    }
  }

  // 更新请求配置
  fetchInit.signal = controller.signal;
  const promise = OcPromise.resolve(fetch(url, fetchInit));
  promise.canceled(() => controller.abort());
  return promise;
}

type OmitContentType = Exclude<string, "content-type" | "contentType">;

type JsonRequestHeaders =
  | Headers
  | [OmitContentType, string][]
  | Record<OmitContentType, string>;

type JsonRequestOptions = Omit<FetchOption, "headers"> & {
  headers?: JsonRequestHeaders;
};

/**
 * 创建请求体是application/json的请求
 * @param {FetchUrl} url
 * @param {JsonRequestOptions} init
 * @returns
 */
export function createJsonRequest(
  url: FetchUrl,
  init?: JsonRequestOptions
): OcPromise<Response> {
  const headers = new Headers(init?.headers);
  headers.delete("content-type");
  headers.append("content-type", "application/json");
  return createCancelRequest(url, { ...(init || {}), headers });
}

/**
 * @template T
 * @param {OcPromise<Response>} response
 * @returns {OcPromise<T>}
 */
function json<T>(response: OcPromise<Response>): OcPromise<T> {
  return response.then((res) => res.json());
}

/**
 * 创建响应体是json格式的请求
 * @template T
 * @param {FetchUrl} url
 * @param {FetchOption} init
 * @returns {OcPromise<T>}
 */
export function createRequestJson<T>(
  url: FetchUrl,
  init?: FetchOption
): OcPromise<T> {
  return json<T>(createCancelRequest(url, init));
}
/**
 * 创建请求体是application/json、响应体是json格式的请求
 * @template T
 * @param {FetchUrl} url
 * @param {JsonRequestOptions} init
 * @returns {OcPromise<T>}
 */
export function createJsonRequestJson<T>(
  url: FetchUrl,
  init?: JsonRequestOptions
): OcPromise<T> {
  return json<T>(createJsonRequest(url, init));
}
