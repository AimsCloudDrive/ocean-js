import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createReaction, reactive } from "@ocean/reaction";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <button
      onClick={() => {
        ob.a.b.c = 111;
      }}
    >
      changeC
    </button>
    <button
      onClick={() => {
        ob.a.b = { c: 10 };
      }}
    >
      changeB
    </button>
  </StrictMode>
);

const ob = reactive({ a: { b: { c: 1 } } });
const reaction = createReaction(
  () => {
    console.log(ob.a.b);
  },
  {
    scheduler: (handler) => {
      setTimeout(() => {}, 1000);
    },
  }
);

Object.assign(window, { ob, reaction });
