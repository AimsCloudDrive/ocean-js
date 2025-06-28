/** @jsx createElement */

import { createElement, render } from "@msom/dom";
import { component, Component, ComponentProps, option } from "@msom/component";

@component("a")
class AA extends Component<ComponentProps & { a: string }> {
  @option({ type: "boolean" })
  declare a: boolean;
}

render(<AA a={"1"}></AA>, document.getElementById("root")!);
