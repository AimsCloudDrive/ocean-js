/** @jsx createElement */

import { createElement, render, Context, VNode } from "@ocean/dom";
import {
  component,
  Component,
  ComponentProps,
  option,
  observer,
} from "@ocean/component";

declare global {
  namespace Component {
    interface Context {
      test: {
        a: string;
      };
    }
  }
}
@component("floor1")
class Floor1 extends Component<ComponentProps<VNode>> {
  constructor(props: any) {
    super(props);
    const className = this.getClassName();
    Object.assign(window, { [className]: this });
  }
  @observer({ initValue: "ac" })
  declare ob: any;
  @observer()
  private declare content?: VNode;
  setJSX(jsx: VNode[] | undefined): void {
    this.content = jsx;
  }
  render() {
    this.ob;
    return (
      <div class={[this.getClassName()]}>
        {this.content || <div class={["content"]}>not fined content</div>}
      </div>
    );
  }
}
@component("floor2")
class Floor2 extends Component<ComponentProps<VNode>> {
  constructor(props: any) {
    super(props);
    const className = this.getClassName();
    Object.assign(window, { [className]: this });
  }
  @observer({ initValue: "ac" })
  declare ob: any;
  @observer()
  private declare content?: VNode;
  setJSX(jsx: VNode[] | undefined): void {
    this.content = jsx;
  }
  render() {
    this.ob;
    return (
      <div class={[this.getClassName()]}>
        {this.content || <div class={["content"]}>not fined content</div>}
      </div>
    );
  }
}
@component("floor3")
class Floor3 extends Component<ComponentProps<() => VNode>> {
  constructor(props: any) {
    super(props);
    const className = this.getClassName();
    Object.assign(window, { [className]: this });
  }
  @observer({ initValue: "ac" })
  declare ob: any;
  @observer()
  private declare content?: () => VNode;
  setJSX(jsx: (() => VNode) | undefined): void {
    this.content = jsx;
  }
  render() {
    this.ob;
    console.info(this.getClassName());
    return (
      <div class={[this.getClassName()]}>
        {this.content ? (
          this.content()
        ) : (
          <div class={["content"]}>not fined content</div>
        )}
      </div>
    );
  }
}
@component("floor4")
class Floor4 extends Component<ComponentProps<VNode>> {
  constructor(props: any) {
    super(props);
    const className = this.getClassName();
    Object.assign(window, { [className]: this });
  }
  @observer({ initValue: "ac" })
  declare ob: any;
  @observer()
  private declare content?: VNode;
  setJSX(jsx: VNode | undefined): void {
    this.content = jsx;
  }
  render() {
    this.ob;
    console.info(this.getClassName());
    return (
      <div class={[this.getClassName()]}>
        {this.content || <div class={["content"]}>not fined content</div>}
      </div>
    );
  }
}

render(
  <Floor1 class={"floor1"}>
    <Floor2 class={"floor2"}>
      <Floor3 class={"floor3"}>
        {() => <Floor4 class={"floor4"}></Floor4>}
      </Floor3>
    </Floor2>
  </Floor1>,
  document.getElementById("root")!
);
