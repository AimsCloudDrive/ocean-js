/**@jsx createElement */
import { createElement } from "../element";
import {
  Component,
  ComponentEvents,
  ComponentProps,
  component,
} from "@ocean/component";

export type ContextProps = {} & ComponentProps<VNode | (() => VNode)>;

@component("context")
export class Context extends Component<
  ContextProps,
  ComponentEvents & { a: 1 }
> {
  private declare content: VNode | (() => VNode) | undefined;

  setJSX(jsx: ContextProps["children"]): void {
    this.content = jsx;
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}

<div
  onchange={(e) => {
    e.target;
  }}
  onclick={(e) => {}}
  class={{
    a: true,
  }}
>
  <Context class={[""]}></Context>
</div>;
