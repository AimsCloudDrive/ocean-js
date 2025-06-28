/**@jsx createElement */
import { VNode, createElement, render } from "@msom/dom";
import {
  component,
  Component,
  ComponentProps,
  createSingleRef,
  SingleRef,
  observer,
} from "@msom/component";

type GUIProps = ComponentProps & {};

@component("GUI")
class GUI extends Component<GUIProps> {
  @observer()
  declare options: VNode[];
  init(): void {
    super.init();
    this.options = [];
  }

  render() {
    return <div class={["guiContainer"]}>{this.options}</div>;
  }
  add(initial: { [K in string]: any }, option?: any[]) {
    const one = Object.keys(initial).unshift();
    const inputRef: SingleRef<HTMLInputElement> = createSingleRef();
    const section = (
      <div class={["section-container"]}>
        <span>{one || "undefined"}</span>
        <span>: </span>
        <input value={initial[one]} $ref={inputRef}></input>
      </div>
    );
    this.options.push(section);
    this.updateProperty("options");
    return {
      onChange: (onChanged: (value: any) => void) => {
        const input = inputRef.current;
        if (input) {
          input.addEventListener("change", (e) => {
            onChanged(
              typeof initial[one] === "number"
                ? Number(input.value)
                : input.value
            );
          });
        }
      },
    };
  }
}

export function addSample(
  info: {},
  sample: (target: HTMLDivElement, gui: GUI) => void
) {
  const body = document.body;
  const targetRef: SingleRef<HTMLDivElement> = createSingleRef();
  const guiRef: SingleRef<GUI> = createSingleRef();
  render(
    <div class={["sample"]}>
      <div class={["active"]} $ref={targetRef} />
      <GUI $ref={guiRef}></GUI>
    </div>,
    body
  );
  sample(targetRef.current, guiRef.current);
}
