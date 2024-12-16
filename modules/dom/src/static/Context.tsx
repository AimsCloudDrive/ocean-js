import { Component, ComponentProps, component } from "@ocean/component";
import { observer } from "@ocean/reaction";

export type ContextProps = {} & ComponentProps<
  (() => JSX.Element) | JSX.Element
>;

@component("context")
export class Context extends Component<ContextProps> {
  private declare content: JSX.Element | (() => JSX.Element) | undefined;

  setJSX(jsx: (() => JSX.Element) | JSX.Element | undefined): void {
    this.content = jsx;
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}
