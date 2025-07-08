/** @jsx createElement */
import { Component, component } from "@msom/component";
import { createRequestJson } from "@msom/common";
import { SingleRef, createSingleRef, createElement } from "@msom/dom";
import { observer } from "@msom/reaction";

type File = "file";
type Directory = "directory";

interface IFile {
  name: string;
  path: string;
  type: File;
}

interface IDirectory extends Omit<IFile, "type"> {
  type: Directory;
  children: Tree;
}

function isDirectory(fileLike: IFile | IDirectory): fileLike is IDirectory {
  return Reflect.has(fileLike, "children");
}

type Tree = (IFile | IDirectory)[];

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
            {}
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
  declare tree: Tree;

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
                    this.iframe.current.src = `/demo/${node.path}`;
                  }
                }}
              >
                {node.name}
              </div>
              {isDirectory(node) && this.renderTree(node.children)}
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
