import { createServer } from "@msom/http";
import bodyParser from "body-parser";

const businessModules: any[] = [
  {
    id: "1",
    uuid: "1234567890abcdef1234567890abcdef",
    moduleCode: "01",
    moduleName: "现金督查",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "2",
    uuid: "234567890abcdef1234567890abcdef1",
    moduleCode: "02",
    moduleName: "交易复检",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "3",
    uuid: "34567890abcdef1234567890abcdef12",
    moduleCode: "03",
    moduleName: "服务监督",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "4",
    uuid: "4567890abcdef1234567890abcdef123",
    moduleCode: "04",
    moduleName: "厅堂助手",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
];

createServer(65500, {
  middles: {
    define: (ds) => {
      // 添加 body-parser 中间件来处理表单编码的请求数据
      ds.push(bodyParser.urlencoded({ extended: true }));
      // 同时支持 JSON 格式的请求数据
      ds.push(bodyParser.json());
      return ds;
    },
  },
  routes: [
    {
      path: "/business/module/page",
      method: "get",
      handlers: [
        (req, res) => {
          // 处理 'params[pageNo]' 格式的查询参数
          const pageNo = req.query["params[pageNo]"] || "1";
          const maxResults = req.query["params[maxResults]"] || "10";
          const moduleCode = req.query["params[moduleCode]"];
          const moduleName = req.query["params[moduleName]"];

          // 过滤数据
          let filteredData = [...businessModules];

          if (moduleCode) {
            filteredData = filteredData.filter(
              (item) => item.moduleCode === moduleCode.toString(),
            );
          }

          if (moduleName) {
            filteredData = filteredData.filter((item) =>
              item.moduleName.includes(moduleName.toString()),
            );
          }

          // 分页处理
          const start =
            (parseInt(pageNo as any) - 1) * parseInt(maxResults as any);
          const end = start + parseInt(maxResults as any);
          const paginatedData = filteredData.slice(start, end);

          res.json({
            code: 200,
            message: "success",
            data: paginatedData,
            total: filteredData.length,
          });
        },
      ],
    },
    {
      path: "/business/module/update",
      method: "put",
      handlers: [
        (req, res) => {
          const { id, timestamp, ...data } = req.body;

          if (!id) {
            res.json({
              code: 400,
              message: "error",
              data: null,
              total: 0,
            });
            return;
          }

          // 确保 id 比较时类型一致
          const index = businessModules.findIndex(
            (item) => item.id === id.toString(),
          );

          if (index === -1) {
            res.json({
              code: 404,
              message: "error",
              data: null,
              total: 0,
            });
            return;
          }

          // 更新模块信息
          const updatedModule = {
            ...businessModules[index],
            ...data,
            moduleCode: data.moduleCode || businessModules[index].moduleCode,
            moduleName: data.moduleName || businessModules[index].moduleName,
            delFlag:
              data.delFlag !== undefined
                ? data.delFlag
                : businessModules[index].delFlag,
            updatedBy: "admin",
            updatedTime: new Date().toLocaleString(),
          };

          businessModules[index] = updatedModule;

          res.json({
            code: 200,
            message: "success",
            data: updatedModule,
            total: 1,
          });
        },
      ],
    },
  ],
  createHandle: ({ port }) => {
    console.log("服务器已启动", port);
  },
  printProxy: true,
  proxy: {
    "/upms/": {
      target: "http://116.63.132.84:7070",
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log(
          `[PROXY:9208] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`,
        );
      },
    },
    "/fds/": {
      target: "http://116.63.132.84:8001",
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log(
          `[PROXY:9208] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`,
        );
      },
    },
  },
});
