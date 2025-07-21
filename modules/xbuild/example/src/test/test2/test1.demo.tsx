import { addSample } from "@msom/gallay";

export default addSample({}, (target, gui) => {
  const demo = document.createElement("div");
  demo.className = "test1";
  target.appendChild(demo);
  gui.add({ kkk: "" }).onChange(console.info);
});
