import { mountComponent, mountWith } from "@msom/dom";
import "./index.less";
import { App } from "./App";

// mountComponent(new App({}), document.getElementById("root")!);
mountWith(() => <App></App>, document.getElementById("root")!);
