import bodyParser from "body-parser";
import express, { Request, Response, Router } from "express";
import { DBContext } from "./DBContext";
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
}

export class DatabaseProxyService {
  private declare app: ReturnType<typeof express>;
  private declare router: Router;
  private declare queryExecutor: QueryExecutor;
  private declare base: string;

  constructor(
    private dbContext: DBContext,
    option?: DatabaseProxyServiceOption
  ) {
    this.app = express();
    this.queryExecutor = new QueryExecutor({ dbContext });
    this.router = Router();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupApp();
    this.base = "";
    Object.assign(this, option || {});
  }

  private setupMiddleware(): void {
    this.app.use(bodyParser.json());
    this.app.use((req, res, next) => {
      console.log(
        `${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`
      );
      next();
    });
  }

  private setupApp(): void {
    this.router.route(this.base);
    this.app.use(this.router);
  }

  private setupRoutes(): void {
    this.router;
    // 查询端点
    this.router.post("/query", async (req: Request, res: Response) => {
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
    });

    // 模型元数据管理端点
    this.router.post("/model-meta", async (req: Request, res: Response) => {
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
          error.message || "Failed to save model metadata"
        );
      }
    });

    // 获取模型元数据端点
    this.router.get(
      "/model-meta/:modelName",
      async (req: Request, res: Response) => {
        try {
          const modelName = req.params.modelName;
          const meta = this.dbContext.getModelMeta(modelName);

          if (!meta) {
            return this.sendError(
              res,
              404,
              `Model metadata not found for: ${modelName}`
            );
          }

          this.sendSuccess(res, meta);
        } catch (error: any) {
          this.sendError(
            res,
            500,
            error.message || "Failed to get model metadata"
          );
        }
      }
    );

    // 获取所有模型名称
    this.router.get("/models", async (req: Request, res: Response) => {
      try {
        const modelNames = this.dbContext.getAllModelNames();
        this.sendSuccess(res, modelNames);
      } catch (error: any) {
        this.sendError(res, 500, error.message || "Failed to get model names");
      }
    });

    // 健康检查端点
    this.router.get("/health", async (req: Request, res: Response) => {
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

        res.json(response);
      } catch (error: any) {
        const response: HealthCheckResponse = {
          status: "error",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          dbStatus: "error",
        };

        res.status(500).json(response);
      }
    });

    // 清空缓存端点
    this.router.post("/clear-cache", async (req: Request, res: Response) => {
      try {
        this.queryExecutor.clearCache();
        this.sendSuccess(res, { message: "Cache cleared successfully" });
      } catch (error: any) {
        this.sendError(res, 500, error.message || "Failed to clear cache");
      }
    });
  }

  private sendSuccess<T>(res: Response, data: T, message?: string): void {
    res.json(createSuccessResponse(data, message));
  }

  private sendError(
    res: Response,
    status: number,
    message: string,
    details?: any
  ): void {
    res.status(status).json(createErrorResponse(message, details));
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`\n🚀 Database proxy service running on port ${port}`);
      console.log(`📊 Query endpoint: POST http://localhost:${port}/query`);
      console.log(
        `📝 Model meta endpoint: POST http://localhost:${port}/model-meta`
      );
      console.log(
        `📋 Model meta endpoint: GET http://localhost:${port}/model-meta/:modelName`
      );
      console.log(`📚 Models endpoint: GET http://localhost:${port}/models`);
      console.log(
        `🧹 Cache endpoint: POST http://localhost:${port}/clear-cache`
      );
      console.log(`❤️  Health check: GET http://localhost:${port}/health\n`);
    });
  }
}
export function createSuccessResponse<T = any>(
  data: T,
  message?: string
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
  details?: T
): ErrorResponse<T> {
  return {
    code: 1,
    error,
    details,
  };
}
