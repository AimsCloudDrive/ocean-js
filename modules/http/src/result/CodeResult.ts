import { Nullable } from "@msom/common";

class CodeResultConstructor<
  C extends number = number,
  Payload extends { [K in string]: any } = {}
> {
  declare code: C;
  declare message: string | undefined;
  declare payload: Payload | undefined;
  constructor(
    code: C,
    message?: string | undefined | null | Payload,
    payload?: Payload | undefined | null
  ) {
    this.code = code;
    if (payload) {
      if (typeof message === "object" && message !== null) {
        throw Error();
      }
      if (message != undefined) {
        this.message = message;
      }
      this.payload = payload;
    } else if (message != undefined) {
      if (typeof message === "object") {
        this.payload = message;
      } else {
        this.message = message;
      }
    } else {
    }
  }
}

interface CodeResultConstructor<
  C extends number = number,
  Payload extends { [K in string]: any } = {}
> {
  readonly prototype: CodeResultConstructor;
  new (code: C, message?: string | Nullable): CodeResultConstructor;
  new (code: C, payload?: Payload | Nullable): CodeResultConstructor;
  new (
    code: C,
    message?: string | Nullable,
    payload?: Payload | Nullable
  ): CodeResultConstructor;
}

// export const CodeResult: CodeResultConstructor = CodeResultConstructor;
export { CodeResultConstructor as CodeResult };
