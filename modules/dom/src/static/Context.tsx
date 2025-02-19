import { Component, ComponentProps, component } from "@ocean/component";

export type ContextProps = {} & ComponentProps<
  (() => React.JSX.Element) | React.JSX.Element
>;

@component("context")
export class Context extends Component<ContextProps> {
  private declare content:
    | React.JSX.Element
    | (() => React.JSX.Element)
    | undefined;

  setJSX(jsx: (() => React.JSX.Element) | React.JSX.Element | undefined): void {
    this.content = jsx;
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}
