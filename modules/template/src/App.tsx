import { Component, component } from "@msom/component";
import { createRequestJson } from "@msom/common";
import { SingleRef, createSingleRef } from "@msom/dom";
import { computed, createReaction, observer } from "@msom/reaction";

enum FileLikeType {
  File = "file",
  Directory = "directory",
}

interface IFile {
  name: string;
  path: string;
  type: FileLikeType.File;
}

interface IDirectory extends Omit<IFile, "type"> {
  type: FileLikeType.Directory;
  children: Trees;
}

type Trees = (IFile | IDirectory)[];

interface TreeStatus {
  collapse: boolean;
}

type HasStatus<T extends IDirectory> = T & { status: TreeStatus };

type TreesInfo = (IFile | HasStatus<IDirectory>)[];

function isDirectory(fileLike: IFile | IDirectory): fileLike is IDirectory {
  return fileLike.type === FileLikeType.Directory;
}
/**
 * 根据自己的展开与否与子目录的展开与否以及子元素的数量来获得应该展示的高度
 */
function getDirectoryTreeHeight(tree: HasStatus<IDirectory>): number {
  return 0;
}

@component("App2")
export class App extends Component {
  render() {
    return (
      <div class="app-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <div class="logo">DEMO</div>
            <div class="title">Demo 列表</div>
          </div>
          <div class="file-tree-container">
            {this.renderTree(this.tree || [])}
          </div>
        </div>

        <div class="content">
          <iframe $ref={this.iframe} class="demo-frame"></iframe>
        </div>
      </div>
    );
  }

  @observer()
  declare activePath: string;

  @observer()
  declare tree: Trees | undefined;
  @observer()
  declare showTreeInfo: TreesInfo;

  mounted(): void {
    this.loadFileTree().then((tree) => {
      this.tree = tree;
    });
  }

  declare iframe: SingleRef<HTMLIFrameElement>;
  init(): void {
    super.init();
    this.tree = [];
    this.iframe = createSingleRef();
    this.onclean(
      createReaction(
        () => {
          this.tree;
        },
        () => {
          /**
           * TODO
           * 同步生成状态showTreeInfo，
           * 更新时保留同名目录的展开情况
           */
        }
      )
        .exec()
        .disposer()
    );
  }

  renderTree(tree: Trees, level = 0) {
    return (
      <ul class={`tree-level-${level}`}>
        {tree.map((node) => {
          const isDir = isDirectory(node);
          return (
            <li class={`tree-node ${isDir ? "directory" : "file"}`}>
              <div
                class={[
                  "node-content",
                  this.activePath === node.path && "active",
                ]}
                onclick={() => {
                  if (!isDir) {
                    this.activePath = node.path;
                    this.iframe.current.src = `/demo?modulePath=${node.path}`;
                  }
                }}
              >
                <i
                  class={`node-icon ${isDir ? "folder-icon" : "file-icon"}`}
                ></i>
                <div class="node-name">{node.name}</div>
              </div>
              {isDir && (
                <div class="children-container">
                  {this.renderTree(node.children, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  loadFileTree() {
    return createRequestJson<Trees>("/demo/file-tree");
  }
}

function addStyle(cssStyle: string) {
  // 添加样式
  const style = document.createElement("style");
  style.textContent = cssStyle;
  document.head.appendChild(style);
}

addStyle(`/* 暗色主题 */
:root {
  --bg-dark: #1e1f25;
  --sidebar-bg: #25262e;
  --sidebar-header: #1a1b21;
  --border-color: #383a46;
  --text-primary: #e2e4e9;
  --text-secondary: #a2a5b5;
  --accent-color: #646cff;
  --hover-bg: #2d2e3a;
  --active-bg: #343747;
  --scrollbar-thumb: #4a4d5c;
  --scrollbar-track: #25262e;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background-color: var(--bg-dark);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  height: 100vh;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px;
  background-color: var(--sidebar-header);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  background-color: var(--accent-color);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.file-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

/* 自定义滚动条 */
.file-tree-container::-webkit-scrollbar {
  width: 8px;
}

.file-tree-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.file-tree-container::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 4px;
}

.file-tree-container::-webkit-scrollbar-thumb:hover {
  background: #5a5d6e;
}

/* 树形结构样式 */
.tree-node {
  list-style: none;
  padding: 0;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
}

.node-content:hover {
  background-color: var(--hover-bg);
}

.node-content.active {
  background-color: var(--active-bg);
  position: relative;
}

.node-content.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background-color: var(--accent-color);
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-style: normal;
  position: relative;
}

.node-content.active .node-icon {
  color: var(--accent-color);
}

/* 简约文件图标 */
.file-icon {
  width: 14px;
  height: 16px;
}

.file-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 14px;
  background-color: var(--text-secondary);
  border-radius: 1px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 80% 0, 80% 20%, 100% 20%);
}

.node-content.active .file-icon::before {
  background-color: var(--accent-color);
}

/* 简约文件夹图标 */
.folder-icon {
  width: 16px;
  height: 14px;
}

.folder-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 12px;
  background-color: var(--text-secondary);
  border-radius: 2px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 20% 0, 30% 25%, 70% 25%, 80% 0);
}

.node-content.active .folder-icon::before {
  background-color: var(--accent-color);
}

.node-name {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.children-container {
  padding-left: 16px;
  overflow: hidden;
}

.tree-level-0 > .tree-node > .children-container {
  padding-left: 0;
}

/* 右侧内容区样式 */
.content {
  flex: 1;
  background-color: var(--bg-dark);
  position: relative;
  overflow: hidden;
}

.demo-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  background: white;
}`);
