import { Component, ComponentProps } from "../component/Component";
import { option, component } from "../decorators";
import { observer } from "@msom/reaction";

type UseProps = ComponentProps & {
  instance: Component<any>;
};

@component("use")
export class Use extends Component<UseProps> {
  @option()
  @observer()
  instance: Component<any>;

  render() {
    return this.instance.render();
  }
  mount() {
    return this.instance.mount();
  }
}
