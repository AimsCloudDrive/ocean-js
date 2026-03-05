import { DatabaseProxyService } from "@msom/http";

const service = new DatabaseProxyService({
  base: "/api",
  mongoConfig: {
    uri: "mongodb://never.aims.nevermonarch.cn:27017/",
    dbName: "oom",
    options: {
      authSource: "admin",
      auth: {
        username: "mongo",
        password: "tx009618.",
      },
    },
  },
});

service.start(9999);
