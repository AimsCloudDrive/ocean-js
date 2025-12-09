/** @jsx createElement */
import { createElement, render, createMapRef } from "@msom/dom";
import { createReaction, Observer } from "@msom/reaction";
const ref1 = createMapRef();

const oba = new Observer({ initValue: { cccc: 123 }, deep: true });
oba.set = function (value: any) {
  console.log("set", value);
  Observer.prototype.set.call(this, value);
};

const a = () => (
  <div>
    <div $key={1} $ref={ref1}>
      111
    </div>
    <div $key={2} $ref={ref1}>
      222
    </div>
    <div $key={3} $ref={ref1}>
      {oba.get()}
    </div>
    <div>444</div>
  </div>
);

Object.assign(window, { ref1 });

const ccc = createReaction(() => {
  const aa = a();
  render(aa, document.querySelector("#root")!);
});

Object.assign(window, { reaction: ccc, oba });
