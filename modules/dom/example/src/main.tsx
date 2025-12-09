/** @jsx createElement */
import { createElement, render, createMapRef } from "@msom/dom";
import { createReaction, Observer } from "@msom/reaction";
const ref1 = createMapRef();

const oba = new Observer({ initValue: { cccc: 123 }, deep: true });

const a = () => (
  <div>
    <div $key={1} $ref={ref1}>
      111
    </div>
    <div $key={2} $ref={ref1}>
      222
    </div>
    <div $key={3} $ref={ref1}>
      {oba.get().cccc}
    </div>
    <div>444</div>
  </div>
);

Object.assign(window, { ref1 });

let aa: any = null;
const ccc = createReaction(() => {
  console.log("reaction", oba.get().cccc);
  aa = a();
  render(aa, document.querySelector("#root")!);
});

Object.assign(window, { reaction: ccc, oba });
