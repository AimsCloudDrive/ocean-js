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

```bash
sshpass -p 'tx009618.' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
  -o UserKnownHostsFile=/dev/null root@47.109.110.125 '<远程命令>'
```

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

模型设计器的**前端**构建产物位于 `/var/www/mma/dist/`，并运行在 **3008 端口**上：

```
/var/www/mma/dist/
├── assets/        # 前端静态资源（打包后的 JS/CSS 等）
└── index.html     # 入口 HTML
```

- 前端访问地址：`http://47.109.110.125:3008`（或所在域名:3008）

前端与后端 dist 是两个不同的目录，注意区分：

| 端 | 目录 | 内容 |
|----|------|------|
| 前端 | `/var/www/mma/dist/` | 构建产物（`assets/` + `index.html`） |
| 后端 | `/opt/1panel/apps/model-designer/model-designer/dist/` | Node 产物（`index.js` + `.env`），挂载到容器 `/app/dist` |

> ⚠️ 安全提示：此文件包含 root 密码，请注意不要提交到公开仓库或以其他方式泄露。
