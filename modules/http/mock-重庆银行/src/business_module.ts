import { ServerRoute } from "@msom/http";
import { createQueryOne } from "./common";

// 模拟 business_modules 表的数据
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

// 定义路由
const routes: ServerRoute[] = [
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
        const isNoPage = req.query["params[noPage]"] === "1";

        // 过滤数据，排除软删除的记录
        let filteredData = businessModules.filter(
          (item) => item.delFlag === "0",
        );

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
          data: isNoPage ? filteredData : paginatedData,
          total: filteredData.length,
        });
      },
    ],
    children: [
      {
        path: "/:uuid",
        method: "get",
        handlers: [createQueryOne(() => businessModules, "uuid", "uuid")],
      },
    ],
  },
  {
    path: "/business/module/update",
    method: "put",
    handlers: [
      (req, res) => {
        const { id, uuid, timestamp, ...data } = req.body;

        if (!uuid) {
          res.json({
            code: 400,
            message: "error",
            data: null,
            total: 0,
          });
          return;
        }

        // 确保 uuid 比较时类型一致
        const index = businessModules.findIndex(
          (item) => item.uuid === uuid.toString(),
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
          moduleName: data.moduleName || businessModules[index].moduleName,
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
  {
    path: "/business/module/delete",
    method: "put",
    handlers: [
      (req, res) => {
        const { id, timestamp } = req.body;

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

        // 软删除
        const deletedModule = {
          ...businessModules[index],
          delFlag: "1",
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        businessModules[index] = deletedModule;

        res.json({
          code: 200,
          message: "success",
          data: deletedModule,
          total: 1,
        });
      },
    ],
  },
];

export default routes;
export { businessModules };
