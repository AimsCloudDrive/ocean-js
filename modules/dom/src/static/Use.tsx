import { Nullable } from "@msom/common";
import { Component, component, option } from "@msom/component";
import { observer } from "@msom/reaction";

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
  mount() {
    return this.instance.mount();
  }
}
