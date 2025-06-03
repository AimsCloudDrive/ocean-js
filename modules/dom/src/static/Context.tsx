/**@jsx createElement */
import { createElement } from "../element";
import { Component, ComponentProps, component } from "@ocean/component";
import { VNode } from "../Node";

export type ContextProps = {} & ComponentProps<(() => VNode) | VNode>;

@component("context")
export class Context extends Component<ContextProps> {
  private declare content: VNode | (() => VNode) | undefined;

  setJSX(jsx: (() => VNode) | VNode | undefined): void {
    this.content = jsx;
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}

<>
  <div onClick={(e) => {}}>
    <Context></Context>
  </div>
</>;
