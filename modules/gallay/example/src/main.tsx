import { OcPromise, assert } from "@msom/common";
import { createSingleRef, mountWith } from "@msom/dom";

const demos = import.meta.glob(["./**/*.demo.ts", "./**/*.demo.tsx"]);

Object.assign(window, { demos });

type DemosObject = {
  [K in string]: DemosObject | (() => OcPromise<unknown>);
};

const demosObject = Object.entries(demos)
  .map(([key, value]) => {
    const keys = key.split("/").map((key, i, keys) => {
      if (i !== keys.length - 1) {
        return key;
      } else {
        const names = key.split(".");
        names.pop();
        return names.join(".");
      }
    });
    if (keys[0] === ".") {
      keys.shift();
    }
    return { keys, importH: () => OcPromise.resolve(value()) };
  })
  .reduce((result: DemosObject, { keys, importH }) => {
    let tmp: any = result;
    const name = keys.pop();
    assert(name);
    while (keys.length) {
      const key = keys.shift();
      assert(key);
      tmp[key] = tmp = tmp[key] || {};
    }
    tmp[name] = importH;
    return result;
  }, {});

Object.assign(window, { demosObject });
mountWith(() => {
  const getC = (obj: DemosObject) =>
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === "object") {
        return (
          <div>
            <div class={"p"}>{[key]}</div>
            {getC(value)}
          </div>
        );
      } else {
        return (
          <div
            class={"c"}
            onclick={() => {
              value()
                .then((data) => {
                  console.log(data);
                })
                .catch((reason) => {
                  console.error(reason);
                });
            }}
          >
            {key}
          </div>
        );
      }
    });

  const ref = createSingleRef<HTMLIFrameElement>();

  return (
    <div class={["container"]}>
      {getC(demosObject)}
      <iframe $ref={ref} src=""></iframe>
    </div>
  );
}, document.getElementById("root")!);
