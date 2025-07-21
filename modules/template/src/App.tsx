import { Component, component } from "@msom/component";
import { SingleRef, createSingleRef } from "@msom/dom";
import { observer } from "@msom/reaction";
import { Menu, IFile, Trees } from "./Menu";
import { createRequestJson } from "@msom/common";

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
          <Menu
            $ref={this.menu}
            activePath={this.activePath}
            select={(file) => this.handleFileSelect(file)}
            tree={this.tree || []}
          />
        </div>

        <div class="content">
          <iframe $ref={this.iframe} class="demo-frame"></iframe>
        </div>
      </div>
    );
  }

  @observer()
  declare activePath: string | undefined;
  @observer()
  declare tree: Trees | undefined;

  declare menu: SingleRef<Menu>;
  declare iframe: SingleRef<HTMLIFrameElement>;

  init(): void {
    super.init();
    this.activePath = undefined;
    this.menu = createSingleRef();
    this.iframe = createSingleRef();
  }

  handleFileSelect(file: IFile) {
    this.activePath = file.path;
    requestAnimationFrame(() => {
      this.iframe.current.src = `/demo?modulePath=${file.path}`;
    });
  }

  loadFileTree() {
    return createRequestJson<Trees>("/demo/file-tree");
  }
  mounted(): void {
    this.loadFileTree().then((tree) => {
      this.tree = tree;
    });
  }
}

// 应用整体布局样式
function addAppStyle() {
  const styleId = "app-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* 暗色主题 */
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
      --level-indent: 16px;
      --child-height: 0;
    }
    
    *,
    *::before,
    *::after {
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
    }
  `;
  document.head.appendChild(style);
}

// 确保样式只添加一次
addAppStyle();
