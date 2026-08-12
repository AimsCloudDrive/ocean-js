import { Component, ComponentProps, component } from "@msom/component";
import { createSingleRef, mountWith, SingleRef } from "@msom/dom";
import { observer } from "@msom/reaction";

export type ModelDesignerProps = ComponentProps & {
  title?: string;
};

@component("ModelDesigner")
class ModelDesigner extends Component<ModelDesignerProps> {
  @observer()
  declare nodes: Msom.MsomNode[];

  init(): void {
    super.init();
    this.nodes = [];
  }

  render() {
    return (
      <div class={["model-designer"]}>
        <div class={["model-designer__header"]}>模型设计器</div>
        <div class={["model-designer__body"]}>{this.nodes}</div>
      </div>
    );
  }

  add(node: Msom.MsomNode): void {
    this.nodes.push(node);
    this.updateProperty("nodes");
  }
}

export { ModelDesigner };

/**
 * 将模型设计器挂载到指定容器
 * @param container 容器元素
 * @returns 模型设计器实例引用
 */
export function mountModelDesigner(
  container: HTMLElement
): SingleRef<ModelDesigner> {
  const designerRef: SingleRef<ModelDesigner> = createSingleRef();
  mountWith(() => <ModelDesigner $ref={designerRef} />, container);
  return designerRef;
}
