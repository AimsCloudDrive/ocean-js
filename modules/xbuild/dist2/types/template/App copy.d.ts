import { Component } from "@msom/component";
import { SingleRef } from "@msom/dom";
declare enum FileLikeType {
    File = "file",
    Directory = "directory"
}
interface IFile {
    name: string;
    path: string;
    type: FileLikeType.File;
}
interface IDirectory extends Omit<IFile, "type"> {
    type: FileLikeType.Directory;
    children: Tree;
}
type Tree = (IFile | IDirectory)[];
export declare class App extends Component {
    render(): any;
    activePath: string;
    tree: Tree | undefined;
    mounted(): void;
    iframe: SingleRef<HTMLIFrameElement>;
    init(): void;
    renderTree(tree: Tree): any;
    loadFileTree(): import("@msom/common").OcPromise<Tree, unknown, unknown>;
}
export {};
