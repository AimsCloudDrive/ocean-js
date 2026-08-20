# 项目说明（Ocean-js / 模型设计器）

## 远程服务器连接信息

可通过 SSH 连接到远程开发/部署服务器（root 用户）：

- **IP 地址**：`47.109.110.125`
- **用户名**：`root`
- **密码**：`tx009618.`
- **主机名**：`iZ2vcgqqdosfuqv4mxjzlhZ`（阿里云 ECS）
- **操作系统**：Alibaba Cloud Linux 3 (OpenAnolis Edition)，基于 CentOS/RHEL/Anolis
- **内核**：`5.10.134-18.al8.x86_64`

### 连接方式示例

#### Linux / macOS（sshpass + ssh）

```bash
sshpass -p 'tx009618.' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
  -o UserKnownHostsFile=/dev/null root@47.109.110.125 '<远程命令>'
```

#### Windows（PowerShell + Posh-SSH 模块）

Posh-SSH 是 PowerShell 下的 SSH 客户端模块，支持带密码直接连接，无需 `sshpass`。

```powershell
# 建立连接
$pw = ConvertTo-SecureString 'tx009618.' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $pw)
$s = New-SSHSession -ComputerName '47.109.110.125' -Credential $cred -AcceptKey -ConnectionTimeout 15

# 执行命令
Invoke-SSHCommand -SessionId $s.SessionId -Command '<远程命令>' | Select-Object -ExpandProperty Output

# 关闭连接
Remove-SSHSession -SessionId $s.SessionId | Out-Null
```

> 说明：若提示找不到 `Posh-SSH`，先执行 `Install-Module -Name Posh-SSH -Scope CurrentUser -Force` 安装。

## 模型设计器后端容器挂载卷（Mounts）

模型设计器的后端容器绑定的数据卷如下：

```json
{
  "Type": "bind",
  "Source": "/opt/1panel/apps/model-designer/model-designer/dist",
  "Destination": "/app/dist",
  "Mode": "rw",
  "RW": true,
  "Propagation": "rprivate"
}
```

- **Source**（宿主路径）：`/opt/1panel/apps/model-designer/model-designer/dist`
- **Destination**（容器路径）：`/app/dist`
- **类型**：bind 挂载，读写模式（rw / RW: true）
- **传播**：`rprivate`

该挂载卷是**后端** Node 应用的产物目录（内含 `index.js` 与 `.env`），通过宿主路径映射到容器内的 `/app/dist`。

## 后端 Docker 容器

后端以 Docker 容器方式运行（Docker 容器），**更新后需要重启容器**：

- **容器 ID**：`72d1e59133ccb8cf65a9419ba2b7a22d10ea1a57ae39c1e4127fe6ba521c0abb`
- **容器名称**：`node-app`
- **镜像**：`node-app:latest`
- **状态**：`running`
- **端口映射**：容器 `9091/tcp` → 宿主 `0.0.0.0:9091`

部署完新的后端产物（`/opt/1panel/apps/model-designer/model-designer/dist/`）后，需要重启该容器使改动生效：

```bash
docker restart 72d1e59133ccb8cf65a9419ba2b7a22d10ea1a57ae39c1e4127fe6ba521c0abb
```

## 前端构建产物（dist）

模型设计器的**前端**（Vue 3 + Vapor 无虚拟 DOM 版，源码在 `modules/model-designer-vue`）构建产物位于 `/var/www/mma/dist/`，运行在 **3008 端口**上：

```
/var/www/mma/dist/
├── assets/        # 前端静态资源（打包后的 JS/CSS 等）
└── index.html     # 入口 HTML
```

- 前端访问地址：`http://47.109.110.125:3008/demo/`（或所在域名:3008/demo/）

### nginx 路由（/etc/nginx/conf.d/mma.conf）

| 路径                  | 处理                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| `/demo`               | `alias /var/www/mma/dist`，提供模型设计器前端（Vite `base: "/demo/"`）           |
| `/`                   | `root /var/www/mma` 的 MMA 站点首页                                              |
| `/api/model-designer` | `proxy_pass http://127.0.0.1:9091`，转发到后端（`/api/model-designer/*` → 9091） |

### 前端关键配置与构建

- **vite.config.ts**：`base: "/demo/"`（对应线上 `/demo` 访问路径）；`plugin-vue` 开启 `features.vapor: true`；`/api/model-designer` 代理到 `http://127.0.0.1:9091`，本地调试可以启动本地后端就是代理到本地后端`http://127.0.0.1:9091`，生产环境就是代理到后端`http://47.109.110.125:9091`
- **Vapor 组件需写 `<script setup vapor lang="ts">`**：不加 `lang="ts"` 时 Vapor 编译器不启用 TS 解析，`import type` 与模板内 TS 断言会报错
- 子项目因 pnpm workspace 的 Junction 链接曾指向失效沙箱路径，改用 `npm install` 独立安装依赖（见下）
- 前端打包首先库模式打包组件(在modules/model-designer-vue目录下执行pnpm run build)，然后进入demo目录打包示例应用前端(在modules/model-designer-vue/example目录下执行pnpm run build)

前端与后端 dist 是两个不同的目录，注意区分：

| 端   | 目录                                                   | 内容                                                     |
| ---- | ------------------------------------------------------ | -------------------------------------------------------- |
| 前端 | `/var/www/mma/dist/`                                   | 构建产物（`assets/` + `index.html`）                     |
| 后端 | `/opt/1panel/apps/model-designer/model-designer/dist/` | Node 产物（`index.js` + `.env`），挂载到容器 `/app/dist` |

## 模型设计器项目文档部署

生成的模型设计器相关的项目文档（如需求文档、设计文档等）需要发送到远程服务器的 `/var/www/mma/` 目录下：

- **目标路径**：`/var/www/mma/`
- **传输方式**：通过 SSH/SCP 上传至远程服务器（连接信息见上文"远程服务器连接信息"）

### 更新 index.html 导航按钮

上传文档后，还需在 `/var/www/mma/index.html` 中添加对应的跳转按钮。该 index.html 是 MMA 站点首页，已有的按钮格式如下：

```html
<a href="文件名.html" class="link-btn">查看文档名称</a>
```

按钮放在 `<div class="card">` 内部，与其他按钮并列。例如新增一份设计文档：

```html
<a href="模型设计器设计文档.html" class="link-btn">查看设计文档</a>
```

完整的按钮样式类为 `link-btn`（白底蓝字圆角按钮），无需额外引入 CSS。操作步骤：

1. 通过 SSH 读取当前 `/var/www/mma/index.html`
2. 在 `<div class="card">` 内最后一个 `<a>` 按钮后追加新按钮
3. 将修改后的文件写回服务器

### Windows（PowerShell + Posh-SSH 上传文件）

```powershell
# 建立连接
$pw = ConvertTo-SecureString 'tx009618.' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $pw)
$s = New-SSHSession -ComputerName '47.109.110.125' -Credential $cred -AcceptKey -ConnectionTimeout 15

# 上传文件（本地路径 → 远程 /var/www/mma/）
Set-SCPItem -ComputerName '47.109.110.125' -Credential $cred -AcceptKey `
  -Path '本地文件路径.html' -DestinationType File -Destination '/var/www/mma/'

# 关闭连接
Remove-SSHSession -SessionId $s.SessionId | Out-Null
```

### Linux / macOS（scp 上传文件）

```bash
sshpass -p 'tx009618.' scp -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
  -o UserKnownHostsFile=/dev/null 本地文件路径.html root@47.109.110.125:/var/www/mma/
```

> 注意：上传后可通过 `http://47.109.110.125:3008/文件名.html` 访问该文档。

> ⚠️ 安全提示：此文件包含 root 密码，请注意不要提交到公开仓库或以其他方式泄露。
