import { Component, ComponentProps, component, option } from "@ocean/component";

type UseProps = ComponentProps & {
  instance: Component<any>;
};

@component("use")
export class Use extends Component<UseProps> {
  @option()
  instance: Component<any>;

  render() {
    return this.instance.render();
  }
}
