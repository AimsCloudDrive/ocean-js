import { Client, comp, QueryProtocolBuilder } from "@msom/http";

await fetch("http://localhost:9999/api/clear-cache", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((res) => res.json())
  .then(
    (res) => console.log(res),
    (err) => console.log(err),
  );

//#region test
new Client({ port: 9999, api: "/api" })
  .createQuery(
    new QueryProtocolBuilder("A")
      .model("", (m) =>
        m.relate("B", (r) => r.relate("children", (r) => r.recursive(2))),
      )
      .protocol(),
  )
  .then(
    (res) => console.log(JSON.stringify(res)),
    (err) => console.log(err),
  );

//#endregion
