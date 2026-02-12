import { createServer } from "@msom/http";
import bodyParser from "body-parser";

// 导入路由
import businessModuleRoutes from "./business_module";
import bbxAnalysisItemsRoutes from "./bbx_analysis_items";

// 合并所有路由
const allRoutes = [...businessModuleRoutes, ...bbxAnalysisItemsRoutes];

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
  routes: allRoutes,
  createHandle: ({ port }) => {
    console.log(`\n🚀 Mock server running on port ${port}`);
  },
});
