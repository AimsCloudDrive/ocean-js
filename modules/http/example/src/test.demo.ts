import {
  DBContext,
  DatabaseProxyService,
  QueryProtocolBuilder,
  Client,
  and,
  comp,
} from "@msom/http";

const dbContext = new DBContext("mongodb://never.aims.nevermonarch.cn:27017/", {
  authSource: "admin",
  auth: {
    username: "mongo",
    password: "tx009618.",
  },
});

await dbContext.connect("oom");

const service = new DatabaseProxyService(dbContext, { base: "/api" });

service.start(9999);
