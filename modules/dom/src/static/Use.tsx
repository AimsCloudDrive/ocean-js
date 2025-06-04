import { Nullable } from "@ocean/common";
import { Component, ComponentProps, component, option } from "@ocean/component";
import { observer } from "@ocean/reaction";
import { VNode } from "..";

type UseProps = ComponentProps & {
  instance: Ocean.IComponent<any>;
};

@component("use")
export class Use extends Component<UseProps> {
  @option()
  @observer()
  instance: Ocean.IComponent<any>;

  render() {
    return this.instance.render();
  }
  mount(): VNode | Nullable {
    return this.instance.mount();
  }
}
