import { addSample } from "@ocean/gallay";

addSample({}, (target, gui) => {
  const demo = document.createElement("div");
  demo.className = "ddd";
  target.appendChild(demo);
  gui.add({ kkk: "" }).onChange(console.info);
});
