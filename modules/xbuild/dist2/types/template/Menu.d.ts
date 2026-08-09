import { Component, ComponentEvents, ComponentProps } from "@msom/component";
export declare enum FileLikeType {
    File = "file",
    Directory = "directory"
}
export interface IFile {
    name: string;
    path: string;
    type: FileLikeType.File;
    icon?: ((file: IFile) => Msom.MsomNode) | Msom.MsomNode;
}
export interface IDirectory extends Omit<IFile, "type" | "icon"> {
    type: FileLikeType.Directory;
    children: Trees;
    icon?: ((direction: IDirectory) => Msom.MsomNode) | Msom.MsomNode;
}
export type Trees = (IFile | IDirectory)[];
interface TreeStatus {
    collapsed: boolean;
}
export type HasStatus<T extends IDirectory> = Omit<T, "children"> & {
    children: TreesInfo;
    status: TreeStatus;
};
export type TreesInfo = (IFile | HasStatus<IDirectory>)[];
export declare function isDirectory<T extends IDirectory | HasStatus<IDirectory>>(fileLike: IFile | IDirectory): fileLike is T;
type MenuProps = ComponentProps & {
    tree: Trees;
    activePath: string | undefined;
};
type MenuEvents = ComponentEvents & {
    select: IFile;
};
export declare class Menu extends Component<MenuProps, MenuEvents> {
    tree: Trees | undefined;
    showTreeInfo: TreesInfo;
    activePath: string | undefined;
    init(): void;
    toggleDirectoryCollapse(node: HasStatus<IDirectory>): void;
    setActiveFile(file: IFile): void;
    renderTree(tree: TreesInfo, level: number): any;
    calculateChildHeight(node: HasStatus<IDirectory>): number;
    render(): any;
}
export {};
