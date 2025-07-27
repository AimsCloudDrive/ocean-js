import {
  Component,
  ComponentEvents,
  ComponentProps,
  component,
  option,
} from "@msom/component";
import { createReaction, observer, reactive } from "@msom/reaction";

export enum FileLikeType {
  File = "file",
  Directory = "directory",
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

export function isDirectory<T extends IDirectory | HasStatus<IDirectory>>(
  fileLike: IFile | IDirectory
): fileLike is T {
  return fileLike.type === FileLikeType.Directory;
}

/**
 * 检查目录或其子节点是否包含激活路径
 */
function hasActiveChild(
  node: HasStatus<IDirectory>,
  activePath: string | undefined
): boolean {
  // 当前目录路径匹配
  if (node.path === activePath) return true;

  // 检查子节点
  for (const child of node.children) {
    if (isDirectory(child)) {
      if (hasActiveChild(child as HasStatus<IDirectory>, activePath))
        return true;
    } else {
      if (child.path === activePath) return true;
    }
  }

  return false;
}
type MenuProps = ComponentProps & {
  tree: Trees;
  activePath: string | undefined;
};
type MenuEvents = ComponentEvents & {
  select: IFile;
};

@component("FileMenu", {
  events: {
    select: "string",
  },
})
export class Menu extends Component<MenuProps, MenuEvents> {
  @option()
  @observer()
  declare tree: Trees | undefined;

  @observer()
  declare showTreeInfo: TreesInfo;

  @option()
  @observer()
  declare activePath: string | undefined;

  init(): void {
    super.init();
    this.tree = [];
    this.showTreeInfo = [];

    // 初始化折叠状态管理
    this.onclean(
      createReaction(
        () => {
          return this.tree;
        },
        () => {
          if (!this.tree) {
            this.showTreeInfo = reactive([]);
            return;
          }

          // 创建新树时保留原有的折叠状态
          const statusMap = new Map<string, TreeStatus>();

          // 收集现有的状态
          this.showTreeInfo.forEach((node) => {
            if (isDirectory(node)) {
              statusMap.set(node.path, node.status);
            }
          });

          // 递归处理树结构
          const processTree = (nodes: Trees): TreesInfo => {
            return nodes.map((node) => {
              if (isDirectory(node)) {
                // 尝试保留现有的折叠状态，否则使用默认状态
                const existingStatus = statusMap.get(node.path);
                const status: TreeStatus = existingStatus || {
                  collapsed: false,
                };

                // 创建带有状态的目录节点
                const dirNode: HasStatus<IDirectory> = {
                  ...node,
                  status,
                  children: processTree(node.children),
                };

                return dirNode;
              }
              return node;
            });
          };

          this.showTreeInfo = reactive(processTree(this.tree));
        }
      )
        .exec()
        .disposer()
    );
  }

  // 切换目录的折叠状态
  toggleDirectoryCollapse(node: HasStatus<IDirectory>) {
    node.status.collapsed = !node.status.collapsed;
  }

  // 设置活动文件
  setActiveFile(file: IFile) {
    // this.activePath = file.path;
    this.emit("select", file);
  }

  // 渲染树节点
  renderTree(tree: TreesInfo, level: number) {
    return (
      <div class="tree-container">
        {tree.map((node) => {
          const isDir = isDirectory(node);
          const hasActive = isDir && hasActiveChild(node, this.activePath);
          const showActive = isDir && hasActive && node.status.collapsed;

          return (
            <div class={`tree-node ${isDir ? "directory" : "file"}`}>
              <div
                class={[
                  "node-content",
                  (this.activePath === node.path || showActive) && "active",
                ]}
              >
                <div class="node-left" style={`--level: ${level}`}>
                  {typeof node.icon === "function"
                    ? node.icon(node as IFile & IDirectory)
                    : node.icon || (
                        <i
                          class={`node-icon ${
                            isDir ? "folder-icon" : "file-icon"
                          } ${
                            isDir && node.status.collapsed ? "collapsed" : ""
                          }`}
                        ></i>
                      )}
                  <div
                    class="node-name"
                    onclick={() => {
                      if (isDir) {
                        this.toggleDirectoryCollapse(node);
                      } else {
                        this.setActiveFile(node);
                      }
                    }}
                  >
                    {node.name}
                  </div>
                  {isDir && (
                    <div
                      class="chevron"
                      onclick={() => this.toggleDirectoryCollapse(node)}
                    >
                      <i
                        class={`chevron-icon ${
                          node.status.collapsed ? "collapsed" : ""
                        }`}
                      ></i>
                    </div>
                  )}
                </div>
              </div>
              {isDir && (
                <div
                  class={`children-container ${
                    node.status.collapsed ? "collapsed" : "expanded"
                  }`}
                  style={`--child-height: ${this.calculateChildHeight(node)}px`}
                >
                  {this.renderTree(node.children, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 计算子节点高度（用于平滑过渡）
  calculateChildHeight(node: HasStatus<IDirectory>): number {
    if (node.status.collapsed) return 0;

    // 递归计算子节点数量
    const countChildren = (nodes: TreesInfo): number => {
      return nodes.reduce((count, child) => {
        count++;
        if (isDirectory(child) && !child.status.collapsed) {
          count += countChildren(child.children);
        }
        return count;
      }, 0);
    };

    const childCount = countChildren(node.children);
    // 每个子节点高度约为40px
    return childCount * 40;
  }

  render() {
    return (
      <div class="menu-tree-container">
        {this.renderTree(this.showTreeInfo || [], 0)}
      </div>
    );
  }
}

// 文件树专用样式
function addMenuStyle() {
  const styleId = "file-menu-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .menu-tree-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0;
    }
    
    /* 自定义滚动条 */
    .menu-tree-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .menu-tree-container::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }
    
    .menu-tree-container::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb);
      border-radius: 4px;
    }
    
    .menu-tree-container::-webkit-scrollbar-thumb:hover {
      background: #5a5d6e;
    }
    
    /* 树形结构样式 - 使用div重构 */
    .tree-container {
      display: flex;
      flex-direction: column;
    }
    
    .tree-node {
      display: flex;
      flex-direction: column;
      padding: 0;
      margin: 0;
    }
    
    .node-content {
      display: flex;
      height: 40px;
      flex-direction: column;
      position: relative;
    }
    
    .node-left {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      gap: 8px;
      /* 添加层级缩进 */
      padding-left: calc(16px + var(--level) * var(--level-indent));
    }
    
    .node-left:hover {
      background-color: var(--hover-bg);
    }
    
    .node-content.active .node-left {
      background-color: var(--active-bg);
    }
    
    .node-content.active .node-left::before {
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
      transition: transform 0.2s ease;
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
    
    .folder-icon.collapsed::before {
      background-color: var(--text-secondary);
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
      user-select: none;
      padding: 2px 0;
    }
    
    .chevron {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      transition: transform 0.2s ease;
      cursor: pointer;
      border-radius: 4px;
      margin-left: -4px;
    }
    
    .chevron:hover {
      background-color: rgba(100, 108, 255, 0.1);
    }
    
    .chevron-icon {
      display: inline-block;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 4px 0 4px 6px;
      border-color: transparent transparent transparent var(--text-secondary);
      transition: transform 0.2s ease;
    }
    
    .chevron-icon.collapsed {
      transform: rotate(0deg);
    }
    
    .chevron-icon:not(.collapsed) {
      transform: rotate(90deg);
    }
    
    .children-container {
      overflow: hidden;
      transition: height 0.3s ease, opacity 0.2s ease;
      height: 0;
      opacity: 0;
    }
    
    .children-container.expanded {
      height: var(--child-height, auto);
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

// 确保样式只添加一次
addMenuStyle();
