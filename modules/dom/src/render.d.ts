import { IComponent } from "./IComponent";
export declare function render(element: Msom.MsomElement, container: HTMLElement): void;
/**
 * 兼容API：通过回调函数挂载元素到容器
 * @param mount 返回要挂载的元素的函数
 * @param container 父容器元素
 */
export declare function mountWith(mount: () => Msom.MsomElement | void, container: Element): void;
/**
 * 兼容API：挂载组件实例到容器
 * @param component 组件实例
 * @param container 父容器元素
 */
export declare function mountComponent(component: IComponent, container: Element): void;
