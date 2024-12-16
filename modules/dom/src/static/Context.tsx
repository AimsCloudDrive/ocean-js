import { Component, ComponentProps, option } from "@ocean/component";
import { observer } from "@ocean/reaction";

export type ContextProps = {} & ComponentProps<
  (() => JSX.Element) | JSX.Element
>;

export class Context extends Component<ContextProps> {
  @observer()
  private declare content: JSX.Element | (() => JSX.Element);

  setJSX(jsx: (() => JSX.Element) | JSX.Element | undefined): void {
    if (jsx) {
      this.content = jsx;
    }
  }
  render() {
    return typeof this.content === "function" ? this.content() : this.content;
  }
}
