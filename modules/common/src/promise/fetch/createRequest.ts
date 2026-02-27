import { Cloneable } from "../../object";
import { OcPromise } from "../OcPromise";

type FetchParams =
  | string
  | Record<string, any>
  | URLSearchParams
  | Iterable<[string, any]>;
type FetchUrl = string | URL | Request;
type FetchOption = RequestInit & {
  params?: FetchParams;
  timeout?: number;
};

export interface ClientConfig {
  baseURL?: string;
  tokenKey?: string;
  headers?: HeadersInit;
  timeout?: number;
}

export class Client implements Cloneable<Client> {
  private config: ClientConfig;

  constructor(config: ClientConfig = {}) {
    this.config = config;
  }

  clone(config?: ClientConfig): Client {
    return new Client({ ...this.config, ...config });
  }

  private applyParams(url: FetchUrl, params?: FetchParams): FetchUrl {
    if (!params) return url;
    let normalizedParams: URLSearchParams;
    if (params instanceof URLSearchParams) {
      // URLSearchParams参数直接使用
      normalizedParams = params;
    } else if (Array.isArray(params)) {
      // 数组参数转换为URLSearchParams
      normalizedParams = new URLSearchParams(params);
    } else if (typeof params === "object" && params !== null) {
      // 对象参数转换为URLSearchParams
      normalizedParams = new URLSearchParams(Object.entries(params));
    } else {
      // 其他类型参数直接转换为空字符串
      normalizedParams = new URLSearchParams();
    }
    // 应用参数到URL
    const applyParams = (urlObj: URL) => {
      normalizedParams.forEach((value, key) => {
        // 删除已存在的参数值
        urlObj.searchParams.delete(key);
        // 如果值是数组，遍历每个元素添加到URLSearchParams中
        if (Array.isArray(value)) {
          // 过滤掉null和undefined值
          // 遍历每个元素添加到URLSearchParams中
          value.forEach(
            (v) => v != null && urlObj.searchParams.append(key, String(v)),
          );
        } else if (value != null) {
          // 非数组值直接设置
          urlObj.searchParams.set(key, String(value));
        }
      });
    };
    // 拼接完整URL
    try {
      if (typeof url === "string") {
        const baseURL = url.startsWith("/")
          ? this.config.baseURL || window.location.origin
          : undefined;
        const urlObj = new URL(url, baseURL);
        applyParams(urlObj);
        return urlObj.toString();
      } else if (url instanceof URL) {
        applyParams(url);
        return url;
      } else if (url instanceof Request) {
        const urlObj = new URL(url.url);
        applyParams(urlObj);
        return new Request(urlObj.toString(), { ...url });
      }
    } catch (e) {
      console.error("URL处理错误:", e);
    }

    return url;
  }

  request(
    url: FetchUrl,
    init: FetchOption = {},
  ): OcPromise<Response, any, unknown> {
    const controller = new AbortController();
    const timeout = init.timeout || this.config.timeout;

    if (typeof timeout === "number" && timeout > 0) {
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      controller.signal.addEventListener("abort", () =>
        clearTimeout(timeoutId),
      );
    }
    // 合并信号量
    // 调用者传入信号量时，合并到控制器信号量中
    const signalOption = init.signal;
    if (signalOption) {
      const handleAbort = () => {
        controller.abort();
        // 调用者信号量也触发abort事件
        externalSignalCleanup();
      };
      signalOption.addEventListener("abort", handleAbort, { once: true });
      const externalSignalCleanup = () => {
        // 调用者信号量也触发abort事件后，该请求已经取消，移除事件监听
        signalOption.removeEventListener("abort", handleAbort);
      };
    }
    // 处理URL参数
    const processedUrl = this.applyParams(url, init.params);
    // 合并headers
    const mergedHeaders = new Headers(this.config.headers);
    if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        mergedHeaders.set(key, value);
      });
    }
    // 构建fetch请求参数
    const fetchInit: FetchOption = {
      ...init,
      signal: controller.signal,
      headers: mergedHeaders,
    };
    // 移除params和timeout参数，因为fetch不支持
    delete fetchInit.params;
    delete fetchInit.timeout;
    // 创建Promise实例
    const { promise, resolve, reject } = OcPromise.withResolvers<Response>();
    fetch(processedUrl, fetchInit).then(resolve, reject);
    promise.canceled(() => controller.abort());
    return promise;
  }

  get(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown> {
    return this.request(url, { ...init, method: "GET" });
  }

  post(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown> {
    return this.request(url, { ...init, method: "POST" });
  }

  put(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown> {
    return this.request(url, { ...init, method: "PUT" });
  }

  delete(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown> {
    return this.request(url, { ...init, method: "DELETE" });
  }

  patch(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown> {
    return this.request(url, { ...init, method: "PATCH" });
  }

  private json<T>(
    response: OcPromise<Response, unknown, unknown>,
  ): OcPromise<T, unknown, unknown> {
    return response.then((res) => res.json());
  }

  /**
   * 发送JSON格式的请求
   * @param url 请求URL
   * @param init 请求选项
   * @returns 响应Promise
   */
  jsonRequest(
    url: FetchUrl,
    init?: FetchOption,
  ): OcPromise<Response, unknown, unknown> {
    const headers = new Headers(init?.headers || this.config.headers);
    headers.delete("content-type");
    headers.append("content-type", "application/json");
    return this.request(url, { ...(init || {}), headers });
  }

  /**
   * 发送请求并解析响应体为JSON
   * @param url 请求URL
   * @param init 请求选项
   * @returns 响应Promise
   */
  requestJson<T>(
    url: FetchUrl,
    init?: FetchOption,
  ): OcPromise<T, unknown, unknown> {
    return this.json<T>(this.request(url, init));
  }

  /**
   * 发送JSON格式的请求并解析响应体为JSON
   * @param url 请求URL
   * @param init 请求选项
   * @returns 响应Promise
   */
  jsonRequestJson<T>(
    url: FetchUrl,
    init?: FetchOption,
  ): OcPromise<T, unknown, unknown> {
    return this.json<T>(this.jsonRequest(url, init));
  }
}

// 默认客户端实例
export const defaultClient = new Client();

export function createCancelRequest(
  url: FetchUrl,
  fetchInit: FetchOption = {},
  client?: Client,
): OcPromise<Response, unknown, unknown> {
  return (client ?? defaultClient).request(url, fetchInit);
}

/**
 * 创建请求体是application/json的请求
 * @param {FetchUrl} url
 * @param {JsonRequestOptions} init
 * @returns
 */
export function createJsonRequest(
  url: FetchUrl,
  init?: FetchOption,
  client?: Client,
): OcPromise<Response, unknown, unknown> {
  return (client ?? defaultClient).jsonRequest(url, init);
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
  init?: FetchOption,
  client?: Client,
): OcPromise<T, unknown, unknown> {
  return (client ?? defaultClient).requestJson<T>(url, init);
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
  init?: FetchOption,
  client?: Client,
): OcPromise<T, unknown, unknown> {
  return (client ?? defaultClient).jsonRequestJson<T>(url, init);
}