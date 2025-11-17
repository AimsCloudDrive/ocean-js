/** @jsx createElement */
import { createElement, render } from "@msom/dom";

const a = (
  <div>
    <div>aaa</div>
  </div>
);
const b = (
  <div>
    <div>
      <span>bbb</span>
    </div>
  </div>
);

render(a, document.querySelector("#root")!);

setTimeout(() => {
  render(b, document.querySelector("#root")!);
}, 2000);
