import { Cloneable } from "../../object";
import { OcPromise } from "../OcPromise";
type FetchParams = string | Record<string, any> | URLSearchParams | Iterable<[string, any]>;
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
    requestInterceptors?: RequestInterceptor[];
    responseInterceptors?: ResponseInterceptor[];
}
export type RequestInterceptor = (url: FetchUrl, init: FetchOption) => Promise<[FetchUrl, FetchOption]> | [FetchUrl, FetchOption];
export type ResponseInterceptor = (response: Response | unknown) => Promise<Response | unknown> | Response | unknown;
export declare class Client implements Cloneable<Client> {
    private config;
    constructor(config?: ClientConfig);
    clone(config?: ClientConfig): Client;
    private applyParams;
    request(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    get(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    post(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    put(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    delete(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    patch(url: FetchUrl, init?: FetchOption): OcPromise<Response, any, unknown>;
    private json;
    /**
     * 发送JSON格式的请求
     * @param url 请求URL
     * @param init 请求选项
     * @returns 响应Promise
     */
    jsonRequest(url: FetchUrl, init?: FetchOption): OcPromise<Response, unknown, unknown>;
    /**
     * 发送请求并解析响应体为JSON
     * @param url 请求URL
     * @param init 请求选项
     * @returns 响应Promise
     */
    requestJson<T>(url: FetchUrl, init?: FetchOption): OcPromise<T, unknown, unknown>;
    /**
     * 发送JSON格式的请求并解析响应体为JSON
     * @param url 请求URL
     * @param init 请求选项
     * @returns 响应Promise
     */
    jsonRequestJson<T>(url: FetchUrl, init?: FetchOption): OcPromise<T, unknown, unknown>;
}
export declare const defaultClient: Client;
export declare function createCancelRequest(url: FetchUrl, fetchInit?: FetchOption, client?: Client): OcPromise<Response, unknown, unknown>;
/**
 * 创建请求体是application/json的请求
 * @param {FetchUrl} url
 * @param {JsonRequestOptions} init
 * @returns
 */
export declare function createJsonRequest(url: FetchUrl, init?: FetchOption, client?: Client): OcPromise<Response, unknown, unknown>;
/**
 * 创建响应体是json格式的请求
 * @template T
 * @param {FetchUrl} url
 * @param {FetchOption} init
 * @returns {OcPromise<T>}
 */
export declare function createRequestJson<T>(url: FetchUrl, init?: FetchOption, client?: Client): OcPromise<T, unknown, unknown>;
/**
 * 创建请求体是application/json、响应体是json格式的请求
 * @template T
 * @param {FetchUrl} url
 * @param {JsonRequestOptions} init
 * @returns {OcPromise<T>}
 */
export declare function createJsonRequestJson<T>(url: FetchUrl, init?: FetchOption, client?: Client): OcPromise<T, unknown, unknown>;
export {};
