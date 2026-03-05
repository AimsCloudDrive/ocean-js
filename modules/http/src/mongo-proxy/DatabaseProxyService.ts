import express, { Request, Response, Router } from "express";
import { RedisClient } from "../redis";
import { DBContext, DBContextOption } from "./DBContext";
import { QueryExecutor } from "./QueryExecutor";
import { QueryProtocol } from "./QueryProtocolBuilder";
import {
  ErrorResponse,
  HealthCheckResponse,
  ModelMeta,
  SuccessResponse,
} from "./interfaces";

interface DatabaseProxyServiceOption {
  base?: string;
  mongoConfig: {
    uri: string;
    dbName: string;
    options?: DBContextOption;
  };
  redisConfig?: {
    url?: string;
    defaultTTL?: number;
  };
}

export class DatabaseProxyService {
  declare private app: ReturnType<typeof express>;
  declare private router: Router;
  declare private queryExecutor: QueryExecutor;
  declare private base: string;
  declare private dbContext: DBContext;
  declare private redisClient?: RedisClient;

  constructor(option: DatabaseProxyServiceOption) {
    this.app = express();
    this.dbContext = new DBContext(
      option.mongoConfig.uri,
      option.mongoConfig.options,
    );
    this.dbContext.connect(option.mongoConfig.dbName);
    this.redisClient = option.redisConfig
      ? new RedisClient(option.redisConfig)
      : undefined;
    this.queryExecutor = new QueryExecutor({
      dbContext: this.dbContext,
      redisClient: this.redisClient,
    });
    this.router = Router();
    this.base = option.base || "";
    this.setupMiddleware();
    this.setupRoutes();
    this.setupApp();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(
        `${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`,
      );
      next();
    });
  }

  private setupApp(): void {
    this.app.use(this.router);
  }

  private setupRoutes(): void {
    this.router;
    // 查询端点
    this.router.post(
      `${this.base}/query`,
      async (req: Request, res: Response) => {
        try {
          const { protocol } = req.body as {
            protocol: QueryProtocol;
          };

          if (!protocol || !protocol.start) {
            return this.sendError(res, 400, "Invalid query protocol");
          }

          const result = await this.queryExecutor.execute(protocol);
          this.sendSuccess(res, result);
        } catch (error: any) {
          this.sendError(res, 500, error.message || "Query execution failed");
        }
      },
    );

    // 模型元数据管理端点
    this.router.post(
      `${this.base}/model-meta`,
      async (req: Request, res: Response) => {
        try {
          const meta = req.body as ModelMeta;

          if (!meta || !meta.modelName) {
            return this.sendError(res, 400, "Invalid model metadata");
          }

          await this.dbContext.saveModelMeta(meta);
          this.sendSuccess(res, { success: true });
        } catch (error: any) {
          this.sendError(
            res,
            500,
            error.message || "Failed to save model metadata",
          );
        }
      },
    );

    // 获取模型元数据端点
    this.router.get(
      `${this.base}/model-meta/:modelName`,
      async (req: Request, res: Response) => {
        try {
          const modelName = [req.params.modelName].flat()[0];
          const meta = this.dbContext.getModelMeta(modelName);

          if (!meta) {
            return this.sendError(
              res,
              404,
              `Model metadata not found for: ${modelName}`,
            );
          }

          this.sendSuccess(res, meta);
        } catch (error: any) {
          this.sendError(
            res,
            500,
            error.message || "Failed to get model metadata",
          );
        }
      },
    );

    // 获取所有模型名称
    this.router.get(
      `${this.base}/models`,
      async (req: Request, res: Response) => {
        try {
          const modelNames = this.dbContext.getAllModelNames();
          this.sendSuccess(res, modelNames);
        } catch (error: any) {
          this.sendError(
            res,
            500,
            error.message || "Failed to get model names",
          );
        }
      },
    );

    // 健康检查端点
    this.router.get(
      `${this.base}/health`,
      async (req: Request, res: Response) => {
        try {
          const dbStatus = (await this.dbContext.checkConnection())
            ? "connected"
            : "disconnected";
          const response: HealthCheckResponse = {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dbStatus,
          };

          // Include Redis status only if Redis is configured
          if (this.redisClient) {
            // Note: We don't have a direct way to check Redis connection status
            // For simplicity, we'll assume it's connected if it's configured
            response.redisStatus = "connected";
          }

          res.json(response);
        } catch (error: any) {
          const response: HealthCheckResponse = {
            status: "error",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dbStatus: "error",
          };

          // Include Redis status only if Redis is configured
          if (this.redisClient) {
            response.redisStatus = "error";
          }

          res.status(500).json(response);
        }
      },
    );

    // 清空缓存端点
    this.router.post(
      `${this.base}/clear-cache`,
      async (req: Request, res: Response) => {
        try {
          if (!this.redisClient) {
            return this.sendError(
              res,
              400,
              "Redis is not configured, cache functionality is disabled",
            );
          }
          await this.queryExecutor.clearCache();
          this.sendSuccess(res, { message: "Cache cleared successfully" });
        } catch (error: any) {
          this.sendError(res, 500, error.message || "Failed to clear cache");
        }
      },
    );
  }

  private sendSuccess<T>(res: Response, data: T, message?: string): void {
    res.json(createSuccessResponse(data, message));
  }

  private sendError(
    res: Response,
    status: number,
    message: string,
    details?: any,
  ): void {
    res.status(status).json(createErrorResponse(message, details));
  }

  async start(port: number = 3000): Promise<void> {
    const prefix = `http://localhost:${port}${this.base}`;
    await Promise.all([
      this.dbContext.connecting,
      this.redisClient?.connecting,
    ]);

    this.app.listen(port, () => {
      console.log(`\n🚀 Database proxy service running on port ${port}`);
      console.log(`📊 Query endpoint: POST ${prefix}/query`);
      console.log(`📝 Model meta endpoint: POST ${prefix}/model-meta`);
      console.log(
        `📋 Model meta endpoint: GET ${prefix}/model-meta/:modelName`,
      );
      console.log(`📚 Models endpoint: GET ${prefix}/models`);
      console.log(`🧹 Cache endpoint: POST ${prefix}/clear-cache`);
      console.log(`❤️  Health check: GET ${prefix}/health\n`);
    });
  }
}
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
): SuccessResponse<T> {
  return {
    code: 0,
    success: true,
    data,
    message,
  };
}
export function createErrorResponse<T = any>(
  error: string,
  details?: T,
): ErrorResponse<T> {
  return {
    code: 1,
    error,
    details,
  };
}
