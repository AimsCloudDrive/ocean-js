import { mountComponent, mountWith, createElement } from "@msom/dom";
import AMap from "@amap/amap-jsapi-loader";
AMap.load({} as any).then((map) => {
  map;
});
import "./index.css";
import { App } from "./App";

// mountComponent(new App({}), document.getElementById("root")!);
mountWith(() => <App></App>, document.getElementById("root")!);
