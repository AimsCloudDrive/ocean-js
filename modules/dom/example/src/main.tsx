/** @jsx createElement */

import {
  Component,
  ComponentProps,
  SingleRef,
  component,
  createSingleRef,
  observer,
} from "@ocean/component";
import { VNode, createElement, render } from "@ocean/dom";
import { createReaction } from "@ocean/reaction";

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
class Floor3 extends Component<ComponentProps<(floor3: Floor3) => VNode>> {
  constructor(props: ComponentProps<(floor3: Floor3) => VNode>) {
    super(props);
    const className = this.getClassName();
    Object.assign(window, { [className]: this });
  }
  init() {
    super.init();
    this.floor4SingleRef = createSingleRef();
  }
  rendered(): void {
    // debugger;
  }
  declare floor4SingleRef: SingleRef<Floor4>;
  @observer({ initValue: "ac" })
  declare ob: any;
  @observer()
  private declare content?: (floor3: this) => VNode;
  setJSX(jsx: ((floor3: this) => VNode) | undefined): void {
    this.content = jsx;
  }
  render() {
    console.info(this.getClassName());
    return (
      <div class={[this.getClassName()]}>
        {this.content ? (
          this.content(this)
        ) : (
          <div class={["content"]}>{this.ob}</div>
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
        {this.content || <div class={["content"]}>{this.ob}</div>}
      </div>
    );
  }
}

render(
  <Floor1 class={"floor1"}>
    <Floor2 class={"floor2"}>
      <Floor3 class={"floor3"}>
        {(floor3) => (
          <Floor4
            mounted={() => {
              console.info("floor4 mounted");
            }}
            $ref={floor3.floor4SingleRef}
            class={"floor4"}
          ></Floor4>
        )}
      </Floor3>
    </Floor2>
  </Floor1>,
  document.getElementById("root")!
);

// const ref: SingleRef<any> = createSingleRef();

// console.info(Reflect.getOwnPropertyDescriptor(ref, "data"));
// const cc = createReaction(() => {
//   console.info("ref data", ref.data);
// });

// render(
//   <Floor3 class={["floor3"]} $ref={ref}>
//     {(f3) => {
//       return f3.ob;
//     }}
//   </Floor3>,
//   document.getElementById("root")!
// );

// Object.assign(window, { reff: ref, cc });
