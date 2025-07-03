import { mountComponent, mountWith } from "@msom/dom";
import "./index.css";
import { App } from "./App";

mountComponent(new App({}), document.getElementById("root")!);
// mountWith(() => <App></App>, document.getElementById("root")!);
