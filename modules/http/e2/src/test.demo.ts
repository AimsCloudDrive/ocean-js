import {
  DatabaseProxyService,
  QueryProtocolBuilder,
  Client,
  and,
  comp,
} from "@msom/http";

const service = new DatabaseProxyService({ 
  base: "/api",
  mongoConfig: {
    uri: "mongodb://never.aims.nevermonarch.cn:57857/",
    dbName: "test",
    options: {
      authSource: "admin",
      auth: {
        username: "root",
        password: "123456",
      },
    },
  }
});

service.start(9999);

//#region test
new Client({ port: 9999, api: "/api" }).createQuery(
  new QueryProtocolBuilder("A")
    .model("", (m) =>
      m
        .condition(and())
        .relate("AtoB", (r) => r.condition(comp("!=", "", "")).recursive(10))
    )
    .relate("B", (r) => r.recursive(5))
    .protocol()
);

//#endregion
