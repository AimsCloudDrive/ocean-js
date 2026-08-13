import { createHttpModelDesignerApi, ModelDesigner } from "@msom/model-designer";
import { mountWith } from "@msom/dom";

const api = createHttpModelDesignerApi({
  baseUrl: "http://127.0.0.1:9091/api/model-designer",
});

const container = document.getElementById("root")!;
mountWith(
  () => (
    <div>
      <div style="padding: 8px 12px; font: 14px system-ui; color: #334155; border-bottom: 1px solid #e2e8f0">
        模型设计器演示 · 数据后端：http://127.0.0.1:9091（MongoDB）
      </div>
      <ModelDesigner api={api} title="模型设计器" />
    </div>
  ),
  container
);
