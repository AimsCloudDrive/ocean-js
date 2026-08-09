import { Component } from "@msom/component";
import { SingleRef } from "@msom/dom";
import { Menu, IFile, Trees } from "./Menu";
export declare class App extends Component {
    render(): any;
    activePath: string | undefined;
    tree: Trees | undefined;
    menu: SingleRef<Menu>;
    iframe: SingleRef<HTMLIFrameElement>;
    init(): void;
    handleFileSelect(file: IFile): void;
    loadFileTree(): import("@msom/common").OcPromise<Trees, unknown, unknown>;
    mounted(): void;
}
