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