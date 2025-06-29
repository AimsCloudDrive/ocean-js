import { Component, ComponentProps, ComponentEvents } from "../component";
import { component } from "../decorators";

export type ContextProps = {} & ComponentProps<
  Msom.MsomNode | (() => Msom.MsomNode)
>;

@component("context")
export class Context extends Component<
  ContextProps,
  ComponentEvents & { a: 1 }
> {
  private declare content: Msom.MsomNode | (() => Msom.MsomNode) | undefined;

  setJSX(jsx: ContextProps["children"]): void {
    this.content = jsx;
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}

export const jsx = (
  <div
    onchange={(e) => {
      e.target;
    }}
    onclick={(e) => {}}
    class={{
      a: true,
    }}
  >
    {"true"}
    <Context $context={{}} class={[""]} a={() => {}}></Context>
  </div>
);
