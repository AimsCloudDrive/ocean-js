import { createJsonRequestJson } from "@msom/common";
import { QueryProtocol } from "./QueryProtocolBuilder";

interface ClientOption {
  host?: string;
  port?: number;
  protocol?: string;
  api?: string;
}

export class Client {
  private declare host: string;
  private declare port: number;
  private declare protocol: string;
  private declare api: string;
  constructor(option: ClientOption = {}) {
    const { host = "localhost", protocol = "http", api = "" } = option;
    let port = option.port;
    if (
      typeof port !== "number" ||
      Math.min(Math.max(0, port), 65535) !== port
    ) {
      port = 5174;
    }
    Object.assign(this, { host, port, protocol, api });
  }
  private get requestHref() {
    const { protocol, host, port, api } = this;
    return `${protocol}://${host}:${port}${api}`;
  }
  createQuery(protocol: QueryProtocol) {
    return createJsonRequestJson(this.requestHref + "/query", {
      body: JSON.stringify({ protocol }),
    });
  }
}
