import { Component, component } from "@msom/component";
import { createRequestJson } from "@msom/common";
import { SingleRef, createSingleRef } from "@msom/dom";
import { observer } from "@msom/reaction";

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
  children: Tree;
}

type Tree = (IFile | IDirectory)[];

function isDirectory(fileLike: IFile | IDirectory): fileLike is IDirectory {
  return fileLike.type === FileLikeType.Directory;
}

@component("App2")
export class App extends Component {
  render() {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <div id="sidebar">
          <div class="header">Demo 列表</div>
          <div class="file-tree" id="file-tree">
            {this.renderTree(this.tree || [])}
          </div>
        </div>

        <div id="content">
          <iframe $ref={this.iframe}></iframe>
        </div>
      </div>
    );
  }

  @observer()
  declare activePath: string;

  @observer()
  declare tree: Tree | undefined;

  mounted(): void {
    this.loadFileTree().then((tree) => {
      this.tree = tree;
    });
  }

  declare iframe: SingleRef<HTMLIFrameElement>;
  init(): void {
    super.init();
    this.iframe = createSingleRef();
  }

  renderTree(tree: Tree) {
    return (
      <ul>
        {tree.map((node) => {
          return (
            <li>
              <div
                class={[
                  "file-item",
                  node.type,
                  this.activePath === node.path && "active",
                ]}
                onclick={() => {
                  if (node.type === "file") {
                    this.activePath = node.path;
                    this.iframe.current.src = `/demo?modulePath=${node.path}`;
                  }
                }}
              >
                {node.name}
              </div>
              {isDirectory(node) ? this.renderTree(node.children) : ""}
            </li>
          );
        })}
      </ul>
    );
  }
  loadFileTree() {
    return createRequestJson<Tree>("/demo/file-tree");
  }
}
