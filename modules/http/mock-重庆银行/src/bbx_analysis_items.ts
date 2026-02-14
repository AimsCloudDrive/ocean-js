import { ServerRoute } from "@msom/http";
import { businessModules } from "./business_module";
import { uuidv7 } from "uuidv7";
import { createQueryOne } from "./common";

// 模拟 bbx_analysis_items 表的数据
const bbxAnalysisItems: any[] = [
  {
    id: "bbxAnalysisItem1",
    uuid: uuidv7(),
    moduleUuid: "1234567890abcdef1234567890abcdef",
    itemCode: "001",
    itemName: "现金核查",
    itemDesc: "对现金进行核查",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxAnalysisItem2",
    uuid: uuidv7(),
    moduleUuid: "234567890abcdef1234567890abcdef1",
    itemCode: "002",
    itemName: "交易复核",
    itemDesc: "对交易进行复核",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxAnalysisItem3",
    uuid: uuidv7(),
    moduleUuid: "34567890abcdef1234567890abcdef12",
    itemCode: "003",
    itemName: "服务检查",
    itemDesc: "对服务质量进行检查",
    delFlag: "0",
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxAnalysisItem4",
    uuid: uuidv7(),
    moduleUuid: "4567890abcdef1234567890abcdef123",
    itemCode: "004",
    itemName: "厅堂管理",
    itemDesc: "对厅堂进行管理",
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
    path: "/business/analysis/items/page",
    method: "get",
    handlers: [
      (req, res) => {
        // 处理 'params[pageNo]' 格式的查询参数
        const pageNo = req.query["params[pageNo]"] || "1";
        const maxResults = req.query["params[maxResults]"] || "10";
        const moduleUuid = req.query["params[moduleUuid]"];
        const itemCode = req.query["params[itemCode]"];
        const itemName = req.query["params[itemName]"];

        // 过滤数据，排除软删除的记录
        let filteredData = bbxAnalysisItems.filter(
          (item) => item.delFlag === "0",
        );
        if (moduleUuid) {
          filteredData = filteredData.filter(
            (item) => item.moduleUuid === moduleUuid.toString(),
          );
        }

        if (itemCode) {
          filteredData = filteredData.filter(
            (item) => item.itemCode === itemCode.toString(),
          );
        }

        if (itemName) {
          filteredData = filteredData.filter((item) =>
            item.itemName.includes(itemName.toString()),
          );
        }

        // 分页处理
        const start =
          (parseInt(pageNo as any) - 1) * parseInt(maxResults as any);
        const end = start + parseInt(maxResults as any);
        const paginatedData = filteredData.slice(start, end).map((item) => {
          if (
            item.moduleUuid &&
            businessModules.find((m) => m.uuid === item.moduleUuid)
          ) {
            const module = businessModules.find(
              (m) => m.uuid === item.moduleUuid,
            );
            item.moduleCode = module.moduleCode;
            item.moduleName = module.moduleName;
          }
          return item;
        });

        res.json({
          code: 200,
          message: "success",
          data: paginatedData,
          total: filteredData.length,
        });
      },
    ],
    children: [
      {
        path: "/:id",
        method: "get",
        handlers: [createQueryOne(() => bbxAnalysisItems, "id", "id")],
      },
    ],
  },
  {
    path: "/business/analysis/items/update/:id",
    method: "put",
    handlers: [
      (req, res) => {
        const { id: bodyId, uuid, timestamp, ...data } = req.body;
        const { id } = req.params;

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
        const index = bbxAnalysisItems.findIndex(
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

        // 更新数据
        const updatedItem = {
          ...bbxAnalysisItems[index],
          ...data,
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxAnalysisItems[index] = updatedItem;

        res.json({
          code: 200,
          message: "success",
          data: updatedItem,
          total: 1,
        });
      },
    ],
  },
  {
    path: "/business/analysis/items/delete/:id",
    method: "delete",
    handlers: [
      (req, res) => {
        const { id } = req.params;

        if (id == undefined) {
          res.json({
            code: 400,
            message: "error",
            data: null,
            total: 0,
          });
          return;
        }

        // 确保 id 比较时类型一致
        const index = bbxAnalysisItems.findIndex(
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
        const deletedItem = {
          ...bbxAnalysisItems[index],
          delFlag: "1",
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxAnalysisItems[index] = deletedItem;

        res.json({
          code: 200,
          message: "success",
          data: deletedItem,
          total: 1,
        });
      },
    ],
  },
  {
    path: "/business/analysis/items/loadTree",
    method: "get",
    handlers: [
      (req, res) => {
        const tree = businessModules
          .filter((module) => module.delFlag === "0")
          .map((module) => {
            return {
              ...module,
              __node_type: "businessModule",
              children: bbxAnalysisItems
                .filter(
                  (item) =>
                    item.moduleUuid === module.uuid && item.delFlag === "0",
                )
                .map((item) => {
                  return {
                    __node_type: "analysisItem",
                    ...item,
                  };
                }),
            };
          });
        res.json({
          code: 200,
          message: "success",
          data: tree,
        });
      },
    ],
  },
];

export default routes;
export { bbxAnalysisItems };
