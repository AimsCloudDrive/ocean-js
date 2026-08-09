import { Cloneable } from "../../object";
import { OcPromise } from "../OcPromise";
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
export declare const enum RequestErrorCode {
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT = "TIMEOUT",
    CANCELED = "CANCELED",
    PARSE_ERROR = "PARSE_ERROR",
    HTTP_ERROR = "HTTP_ERROR",
    BUSINESS_ERROR = "BUSINESS_ERROR",
    UNKNOWN = "UNKNOWN"
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
export type RequestInterceptor = (url: FetchUrl, init: RequestOptions) => Promise<[FetchUrl, RequestOptions]> | [FetchUrl, RequestOptions];
/** 响应拦截器 */
export type ResponseInterceptor = (response: Response | unknown) => Promise<Response | unknown> | Response | unknown;
/** 错误拦截器 */
export type ErrorInterceptor = (error: RequestError, url: URL, init: RequestOptions) => Promise<RequestError | undefined> | RequestError | undefined;
export declare class Client implements Cloneable<Client> {
    private config;
    constructor(config?: ClientConfig);
    clone(config?: ClientConfig): Client;
    private resolveResponseType;
    private getToken;
    private applyParams;
    private log;
    /** 自动判断 body 类型并序列化，返回新的 init */
    private withJsonBody;
    request<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    get<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    post<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    put<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    delete<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    patch<T = unknown>(url: FetchUrl, init?: RequestOptions): OcPromise<T, RequestError, unknown>;
    addRequestInterceptor(interceptor: RequestInterceptor): this;
    addResponseInterceptor(interceptor: ResponseInterceptor): this;
    addErrorInterceptor(interceptor: ErrorInterceptor): this;
}
