# 开发服务器集成指南

## Express服务器设置

```typescript
// src/utils/dev-server.ts
import express from 'express';
import http from 'http';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

interface DevServerOptions {
  port: number;
  publicDir: string;
  proxy?: {
    [key: string]: {
      target: string;
      changeOrigin?: boolean;
      pathRewrite?: Record<string, string>;
    };
  };
}

class DevServer {
  private app: express.Application;
  private server: http.Server;
  private options: DevServerOptions;

  constructor(options: DevServerOptions) {
    this.options = options;
    this.app = express();
    this.setupMiddlewares();
  }

  private setupMiddlewares() {
    // 静态文件服务
    this.app.use(express.static(this.options.publicDir));

    // 代理配置
    if (this.options.proxy) {
      for (const [context, config] of Object.entries(this.options.proxy)) {
        this.app.use(context, createProxyMiddleware({
          target: config.target,
          changeOrigin: config.changeOrigin || true,
          pathRewrite: config.pathRewrite,
        }));
      }
    }

    // 处理SPA路由
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(this.options.publicDir, 'index.html'));
    });
  }

  start() {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`Dev server running at http://localhost:${this.options.port}`);
        
        // 打印代理信息
        if (this.options.proxy) {
          console.log('Proxy configuration:');
          for (const [context, config] of Object.entries(this.options.proxy)) {
            console.log(`  ${context} -> ${config.target}`);
          }
        }
        
        resolve();
      });
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Dev server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default DevServer;
```

## 静态文件中间件

```typescript
// 静态文件服务配置
this.app.use(express.static(this.options.publicDir, {
  index: false, // 禁用自动索引
  maxAge: '1h', // 缓存时间
}));
```

## 代理配置（http-proxy-middleware）

```typescript
// 示例代理配置
const proxyConfig = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '',
    },
  },
};
```

## WebSocket支持

要支持WebSocket，需要确保代理配置正确处理WebSocket连接：

```typescript
this.app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,
  ws: true, // 启用WebSocket支持
}));
```

## 热更新实现

热更新可以通过以下方式实现：

1. **使用WebSocket推送更新通知**
2. **在客户端监听更新事件**
3. **自动刷新页面或更新模块**

```typescript
// 简单的热更新服务
import WebSocket from 'ws';

class HotReloadServer {
  private wss: WebSocket.Server;

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupListeners();
  }

  private setupListeners() {
    this.wss.on('connection', (ws) => {
      console.log('Hot reload client connected');
      
      ws.on('close', () => {
        console.log('Hot reload client disconnected');
      });
    });
  }

  notifyUpdate() {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('update');
      }
    });
  }
}
```

## 客户端热更新代码

```javascript
// public/hot-reload.js
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  if (event.data === 'update') {
    window.location.reload();
  }
};
```

## 集成到构建工具

```typescript
// src/commands/dev.ts
import Builder from '../core/builder';
import DevServer from '../utils/dev-server';
import HotReloadServer from '../utils/hot-reload';
import http from 'http';

async function dev() {
  const builder = new Builder('development');
  
  // 构建初始代码
  await builder.build();
  
  // 创建开发服务器
  const devServer = new DevServer({
    port: 3000,
    publicDir: 'dist',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  });
  
  // 启动服务器
  const server = http.createServer(devServer.app);
  const hotReloadServer = new HotReloadServer(server);
  
  server.listen(3000);
  
  // 监听文件变化
  // 当文件变化时，重新构建并通知客户端
  // ...
}

export default dev;
```