import { ServerRoute } from "@msom/http";
import { bbxAnalysisItems } from "./bbx_analysis_items";
import { uuidv7 } from "uuidv7";
import { createQueryOne } from "./common";

// 模拟 bbx_result_mapping 表的数据
const bbxResultMapping: any[] = [
  {
    id: "bbxResultMapping1",
    uuid: uuidv7(),
    moduleCode: "01",
    itemCode: "001",
    degree: "严重",
    resultCode: "RC001",
    resultDesc: "现金账实不符",
    resultFlag: 1,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxResultMapping2",
    uuid: uuidv7(),
    moduleCode: "01",
    itemCode: "001",
    degree: "中等",
    resultCode: "RC002",
    resultDesc: "现金清点不规范",
    resultFlag: 2,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxResultMapping3",
    uuid: uuidv7(),
    moduleCode: "01",
    itemCode: "002",
    degree: "严重",
    resultCode: "RC003",
    resultDesc: "交易未经授权",
    resultFlag: 1,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxResultMapping4",
    uuid: uuidv7(),
    moduleCode: "01",
    itemCode: "002",
    degree: "轻微",
    resultCode: "RC004",
    resultDesc: "交易记录不完整",
    resultFlag: 3,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxResultMapping5",
    uuid: uuidv7(),
    moduleCode: "02",
    itemCode: "003",
    degree: "中等",
    resultCode: "RC005",
    resultDesc: "服务态度不佳",
    resultFlag: 2,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
  {
    id: "bbxResultMapping6",
    uuid: uuidv7(),
    moduleCode: "02",
    itemCode: "004",
    degree: "轻微",
    resultCode: "RC006",
    resultDesc: "厅堂环境不整洁",
    resultFlag: 3,
    delFlag: 0,
    createdBy: "admin",
    createdTime: "2026-02-11 10:00:00",
    updatedBy: "admin",
    updatedTime: "2026-02-11 10:00:00",
  },
];

// 定义路由
const routes: ServerRoute[] = [
  {
    path: "/business/result/mapping/page",
    method: "get",
    handlers: [
      (req, res) => {
        // 处理 'params[pageNo]' 格式的查询参数
        const pageNo = req.query["params[pageNo]"] || "1";
        const maxResults = req.query["params[maxResults]"] || "10";
        const noPage = req.query["params[noPage]"];
        const itemCode = req.query["params[itemCode]"];

        // 过滤数据，排除软删除的记录
        let filteredData = bbxResultMapping;

        if (itemCode) {
          filteredData = filteredData.filter(
            (item) => item.itemCode === itemCode.toString(),
          );
        }

        // 分页处理
        const start =
          (parseInt(pageNo as any) - 1) * parseInt(maxResults as any);
        const end = start + parseInt(maxResults as any);
        const paginatedData = filteredData.map((item) => {
          // 关联 bbx_analysis_items 中的数据
          if (
            item.itemCode &&
            bbxAnalysisItems.find((i) => i.itemCode === item.itemCode)
          ) {
            const analysisItem = bbxAnalysisItems.find(
              (i) => i.itemCode === item.itemCode,
            );
            item.itemName = analysisItem.itemName;
          }
          return item;
        });

        res.json({
          code: 200,
          message: "success",
          data:
            noPage === "1" ? paginatedData : paginatedData.slice(start, end),
          total: filteredData.length,
        });
      },
    ],
    children: [
      {
        path: "/:id",
        method: "get",
        handlers: [createQueryOne(() => bbxResultMapping, "id", "id")],
      },
    ],
  },
  // 新增
  {
    path: "/business/result/mapping/add",
    method: "post",
    handlers: [
      (req, res) => {
        const { id, uuid: _, timestamp, ...data } = req.body;

        // 生成新的 uuid
        const newUuid = uuidv7();

        // 新增数据
        const newItem = {
          ...data,
          uuid: newUuid,
          delFlag: 0,
          createdBy: "admin",
          createdTime: new Date().toLocaleString(),
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxResultMapping.push(newItem);

        res.json({
          code: 200,
          message: "success",
          data: newItem,
          total: 1,
        });
      },
    ],
  },
  // 更新
  {
    path: "/business/result/mapping/update/:uuid",
    method: "put",
    handlers: [
      (req, res) => {
        const { id, uuid: _, timestamp, ...data } = req.body;
        const { uuid } = req.params;

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
        const index = bbxResultMapping.findIndex(
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

        // 更新数据
        const updatedItem = {
          ...bbxResultMapping[index],
          ...data,
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxResultMapping[index] = updatedItem;

        res.json({
          code: 200,
          message: "success",
          data: updatedItem,
          total: 1,
        });
      },
    ],
  },
  // 启用
  {
    path: "/business/result/mapping/enable/:uuid",
    method: "put",
    handlers: [
      (req, res) => {
        const { uuid } = req.params;

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
        const index = bbxResultMapping.findIndex(
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

        // 切换启用/禁用状态
        const currentItem = bbxResultMapping[index];
        const toggledItem = {
          ...currentItem,
          delFlag: 1,
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxResultMapping[index] = toggledItem;

        res.json({
          code: 200,
          message: "success",
          data: toggledItem,
          total: 1,
        });
      },
    ],
  },
  // 禁用
  {
    path: "/business/result/mapping/disable/:uuid",
    method: "put",
    handlers: [
      (req, res) => {
        const { uuid } = req.params;

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
        const index = bbxResultMapping.findIndex(
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

        // 切换启用/禁用状态
        const currentItem = bbxResultMapping[index];
        const toggledItem = {
          ...currentItem,
          delFlag: 0,
          updatedBy: "admin",
          updatedTime: new Date().toLocaleString(),
        };

        bbxResultMapping[index] = toggledItem;

        res.json({
          code: 200,
          message: "success",
          data: toggledItem,
          total: 1,
        });
      },
    ],
  },
];
export default routes;
