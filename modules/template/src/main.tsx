import { mountWith } from "@msom/dom";
import "./index.css";
import { App } from "./App";

mountWith(() => {
  return <App></App>;
}, document.getElementById("root")!);
