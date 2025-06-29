import { Component, ComponentProps } from "../component";
import { option, component } from "../decorators";
import { observer } from "@msom/reaction";
import { IComponent } from "@msom/dom";

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
