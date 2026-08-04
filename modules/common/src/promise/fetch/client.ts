import { Cloneable } from "../../object";
import { OcPromise } from "../OcPromise";
import { OcPromiseCanceledException } from "../OcPromise/OcPromiseCanceledException";

// ============================================================
// 类型定义
// ============================================================

/** 请求方法 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/** URL 参数类型 */
export type QueryParams = string | Record<string, any> | URLSearchParams | Iterable<[string, any]>;

/** 响应体解析方式，对应 Body 接口方法，默认 'json' */
export type ResponseType = "json" | "text" | "blob" | "arrayBuffer" | "formData" | "bytes";

/** fetch 可接受的 URL 类型 */
export type FetchUrl = string | URL | Request;

/** 请求选项 */
export interface RequestOptions extends Omit<RequestInit, "signal"> {
  /** URL 查询参数 */
  params?: QueryParams;
  /** 请求超时时间(ms) */
  timeout?: number;
  /** 请求体 (自动序列化为 JSON) */
  body?: any;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 请求 ID (用于日志追踪) */
  requestId?: string;
  /** 响应体解析方式，默认 'json' */
  responseType?: ResponseType;
}

/** 业务层统一返回类型 */
export interface BusinessResult<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

/** 错误分类 */
export const enum RequestErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  CANCELED = "CANCELED",
  PARSE_ERROR = "PARSE_ERROR",
  HTTP_ERROR = "HTTP_ERROR",
  BUSINESS_ERROR = "BUSINESS_ERROR",
  UNKNOWN = "UNKNOWN",
}

/** 请求错误 */
export interface RequestError<T = unknown> extends Error {
  code: RequestErrorCode;
  status?: number;
  data?: T;
  cause?: unknown;
}

/** 请求进度信息 */
export interface RequestProgress {
  loaded: number;
  total: number;
  percent: number;
}

/** 重试配置 */
export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number | ((attempt: number, error: RequestError) => number);
  retryableStatusCodes?: number[];
  retryOnNetworkError?: boolean;
  onlyIdempotent?: boolean;
}

/** 请求配置 */
export interface ClientConfig {
  baseURL?: string;
  /** Token 在本地存储中的键名 (localStorage) */
  tokenStorageKey?: string;
  /** Token 注入到请求头时的字段名 (默认 'Authorization') */
  tokenHeaderKey?: string;
  /** Token 获取函数 (异步获取，如从 cookie/内存) */
  getToken?: () => Promise<string | null> | string | null;
  headers?: HeadersInit;
  timeout?: number;
  responseType?: ResponseType;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
  retry?: RetryConfig;
  debug?: boolean;
  logPrefix?: string;
}

/** 请求拦截器 */
export type RequestInterceptor = (
  url: FetchUrl,
  init: RequestOptions
) => Promise<[FetchUrl, RequestOptions]> | [FetchUrl, RequestOptions];

/** 响应拦截器 */
export type ResponseInterceptor = (response: Response | unknown) => Promise<Response | unknown> | Response | unknown;

/** 错误拦截器 */
export type ErrorInterceptor = (
  error: RequestError,
  url: URL,
  init: RequestOptions
) => Promise<RequestError | undefined> | RequestError | undefined;

// ============================================================
// 内部工具函数
// ============================================================

function createRequestError<T>(
  code: RequestErrorCode,
  message: string,
  extra: Partial<RequestError<T>> = {}
): RequestError<T> {
  const err = new Error(message) as RequestError<T>;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

async function parseResponseBody<T>(response: Response, responseType: ResponseType): Promise<T> {
  try {
    switch (responseType) {
      case "text":
        return (await response.text()) as unknown as T;
      case "blob":
        return (await response.blob()) as unknown as T;
      case "arrayBuffer":
        return (await response.arrayBuffer()) as unknown as T;
      case "formData":
        return (await response.formData()) as unknown as T;
      case "bytes":
        return (await response.bytes()) as unknown as T;
      case "json":
      default:
        return (await response.json()) as T;
    }
  } catch (e) {
    if (responseType === "json") {
      throw createRequestError(RequestErrorCode.PARSE_ERROR, `JSON 解析失败: ${(e as Error).message}`, { cause: e });
    }
    throw e;
  }
}

function mergeHeaders(...sources: (HeadersInit | undefined)[]): Headers {
  const merged = new Headers();
  for (const source of sources) {
    if (!source) continue;
    if (source instanceof Headers) {
      source.forEach((value, key) => merged.set(key, value));
    } else if (Array.isArray(source)) {
      for (const [key, value] of source) {
        merged.set(key, value);
      }
    } else {
      for (const [key, value] of Object.entries(source)) {
        merged.set(key, String(value));
      }
    }
  }
  return merged;
}

// ============================================================
// Client 类
// ============================================================

export class Client implements Cloneable<Client> {
  private config: ClientConfig;

  constructor(config: ClientConfig = {}) {
    this.config = config;
  }

  clone(config?: ClientConfig): Client {
    return new Client({ ...this.config, ...config });
  }

  private resolveResponseType(initResponseType?: ResponseType): ResponseType {
    return initResponseType ?? this.config.responseType ?? "json";
  }

  private async getToken(): Promise<string | null> {
    const { getToken, tokenStorageKey } = this.config;
    if (getToken) {
      const token = await getToken();
      if (token) return token;
    }
    if (tokenStorageKey && typeof localStorage !== "undefined") {
      return localStorage.getItem(tokenStorageKey);
    }
    return null;
  }

  private applyParams(url: FetchUrl, params?: QueryParams): FetchUrl {
    if (!params) return url;
    let normalizedParams: URLSearchParams;
    if (params instanceof URLSearchParams) {
      normalizedParams = params;
    } else if (Array.isArray(params)) {
      normalizedParams = new URLSearchParams(params as [string, any][]);
    } else if (typeof params === "object" && params !== null) {
      normalizedParams = new URLSearchParams(Object.entries(params as Record<string, any>));
    } else {
      normalizedParams = new URLSearchParams();
    }

    const applyToUrl = (urlObj: URL) => {
      normalizedParams.forEach((value, key) => {
        urlObj.searchParams.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (v != null) urlObj.searchParams.append(key, String(v));
          });
        } else if (value != null) {
          urlObj.searchParams.set(key, String(value));
        }
      });
    };

    try {
      if (typeof url === "string") {
        const baseURL = url.startsWith("/") ? this.config.baseURL || window.location.origin : undefined;
        const urlObj = new URL(url, baseURL);
        applyToUrl(urlObj);
        return urlObj.toString();
      } else if (url instanceof URL) {
        applyToUrl(url);
        return url;
      } else if (url instanceof Request) {
        const urlObj = new URL(url.url);
        applyToUrl(urlObj);
        return new Request(urlObj.toString(), { ...url });
      }
    } catch (e) {
      console.error("[Client] URL 处理错误:", e);
    }
    return url;
  }

  private log(level: "info" | "error" | "warn", message: string, ...args: any[]) {
    if (!this.config.debug) return;
    const prefix = this.config.logPrefix || "[Client]";
    console[level](`${prefix} ${message}`, ...args);
  }

  /** 自动判断 body 类型并序列化，返回新的 init */
  private withJsonBody(init?: RequestOptions): RequestOptions {
    const body = init?.body;
    if (body == null) return init ?? {};
    // 已是 fetch 支持的类型，直接返回
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
    ) {
      return init ?? {};
    }
    // 对象/数组 → JSON 序列化
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return { ...init, headers, body: JSON.stringify(body) };
  }

  request<T = unknown>(url: FetchUrl, init: RequestOptions = {}): OcPromise<T, RequestError, unknown> {
    const startTime = Date.now();
    const timeout = init.timeout ?? this.config.timeout;

    // 合并外部 signal 和超时 signal
    const manualController = new AbortController();
    const signals: AbortSignal[] = [manualController.signal];
    if (typeof timeout === "number" && timeout > 0) {
      signals.push(AbortSignal.timeout(timeout));
    }
    if (init.signal) {
      signals.push(init.signal);
    }
    const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0];

    const responseType = this.resolveResponseType(init.responseType);

    this.log("info", "→ Request", url, init.method || "GET");

    const executeRequestInterceptors = (promise: OcPromise<[FetchUrl, RequestOptions], any, any>) => {
      const interceptors = this.config.requestInterceptors;
      if (!interceptors?.length) return promise;
      let current = promise;
      for (const interceptor of interceptors) {
        current = current.then((res) => OcPromise.resolve(interceptor(...res)));
      }
      return current;
    };

    const executeResponseInterceptors = (promise: OcPromise<Response | unknown, any, any>) => {
      const interceptors = this.config.responseInterceptors;
      if (!interceptors?.length) return promise;
      let current = promise;
      for (const interceptor of interceptors) {
        current = current.then((res) => OcPromise.resolve(interceptor(res)));
      }
      return current;
    };

    const executeErrorInterceptors = (error: RequestError, url: URL, init: RequestOptions) => {
      const interceptors = this.config.errorInterceptors;
      if (!interceptors?.length) return OcPromise.reject(error);
      let chain: OcPromise<RequestError | undefined, never, never> = OcPromise.resolve(undefined);
      for (const interceptor of interceptors) {
        chain = chain.then(() => OcPromise.resolve(interceptor(error, url, init) as RequestError | undefined));
      }
      return chain.then(() => {
        throw error;
      });
    };

    // 1. 请求拦截器最先执行，可修改 url / init / params / headers
    const initPromise = OcPromise.resolve<[FetchUrl, RequestOptions]>([url, init]);

    const mainPromise = executeRequestInterceptors(initPromise).then(([interceptedUrl, interceptedInit]) => {
      // 2. 拦截器执行后，再处理 URL 参数和 Headers 合并
      const processedUrl = this.applyParams(interceptedUrl, interceptedInit.params);
      const mergedHeaders = mergeHeaders(this.config.headers, interceptedInit.headers);

      const fetchInit: RequestOptions = {
        ...interceptedInit,
        signal,
        headers: mergedHeaders,
      };
      delete (fetchInit as any).params;
      delete (fetchInit as any).timeout;
      delete (fetchInit as any).requestId;

      const { promise, resolve, reject } = OcPromise.withResolvers<Response | unknown, any, any>();

      promise.canceled(() => {
        signal?.addEventListener("abort", () => {}, { once: true });
      });

      // 3. 发送请求
      fetch(processedUrl as string | URL | Request, fetchInit as RequestInit)
        .then(async (response) => {
          try {
            const duration = Date.now() - startTime;
            const parsedData = await parseResponseBody<T>(response, responseType);
            this.log("info", "← Response", response.status, `${duration}ms`);

            if (!response.ok) {
              const err = createRequestError(
                RequestErrorCode.HTTP_ERROR,
                response.statusText || `HTTP ${response.status}`,
                { status: response.status, data: parsedData as any }
              );
              reject(err);
            } else {
              resolve(parsedData);
            }
          } catch (parseErr) {
            reject(parseErr);
          }
        })
        .catch((err: unknown) => {
          const error = err as Error;
          if (error.name === "AbortError" || error.name === "TimeoutError") {
            reject(
              createRequestError(RequestErrorCode.TIMEOUT, timeout ? `请求超时 (${timeout}ms)` : "请求已取消", {
                cause: error,
              })
            );
          } else {
            reject(createRequestError(RequestErrorCode.NETWORK_ERROR, error.message || "网络错误", { cause: error }));
          }
        });

      return executeResponseInterceptors(promise);
    });

    mainPromise.canceled(() => {
      // OcPromise 取消时无法直接 abort signal，依赖外部 signal 传播
      manualController.abort();
      return new OcPromiseCanceledException("请求已取消");
    });

    const errorWrappedPromise = mainPromise.catch((error: RequestError) => {
      return executeErrorInterceptors(error, new URL(url.toString()), init);
    });

    return errorWrappedPromise as OcPromise<T, RequestError, unknown>;
  }

  get<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown> {
    return this.request<T>(url, { ...init, method: "GET" });
  }

  post<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown> {
    return this.request<T>(url, { ...this.withJsonBody(init), method: "POST" });
  }

  put<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown> {
    return this.request<T>(url, { ...this.withJsonBody(init), method: "PUT" });
  }

  delete<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown> {
    return this.request<T>(url, { ...this.withJsonBody(init), method: "DELETE" });
  }

  patch<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown> {
    return this.request<T>(url, { ...this.withJsonBody(init), method: "PATCH" });
  }

  addRequestInterceptor(interceptor: RequestInterceptor): this {
    this.config.requestInterceptors = [...(this.config.requestInterceptors || []), interceptor];
    return this;
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): this {
    this.config.responseInterceptors = [...(this.config.responseInterceptors || []), interceptor];
    return this;
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): this {
    this.config.errorInterceptors = [...(this.config.errorInterceptors || []), interceptor];
    return this;
  }
}
