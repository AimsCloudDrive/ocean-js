import { Component, ComponentProps, ComponentEvents } from "../component";
export type ContextProps = {} & ComponentProps<Msom.MsomNode | (() => Msom.MsomNode)>;
export declare class Context extends Component<ContextProps, ComponentEvents & {
    a: 1;
}> {
    private content;
    setJSX(jsx: ContextProps["children"]): void;
    render(): any;
}
export declare const jsx: any;
