import { Nullable } from "@ocean/common";
import { Component, ComponentProps, component, option } from "@ocean/component";
import { observer } from "@ocean/reaction";

type UseProps = ComponentProps & {
  instance: IComponent<any>;
};

@component("use")
export class Use extends Component<UseProps> {
  @option()
  @observer()
  instance: IComponent<any>;

  render() {
    return this.instance.render();
  }
  mount(): VNode | Nullable {
    return this.instance.mount();
  }
}
