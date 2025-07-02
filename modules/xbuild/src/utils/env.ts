import { XBuildMode } from "../core";

const XBUILD_ENV = "XBUILD_ENV";

class XBuildENV {
  private declare envKey: string | symbol;
  constructor(envKey: string | symbol) {
    this.envKey = envKey;
  }
  get env(): XBuildMode {
    return Reflect.get(process.env, this.envKey, process.env);
  }
  to(mode: XBuildMode) {
    Object.assign(process.env, { [this.envKey]: mode });
  }
  reset() {
    Reflect.deleteProperty(process.env, this.envKey);
  }
}

let inst: XBuildENV | undefined;

const _XbuildEnv = new new Proxy(XBuildENV, {
  construct(target, argArray: string[], newTarget) {
    if (!inst) {
      inst = new XBuildENV(argArray[0]);
    }
    return inst;
  },
})(XBUILD_ENV);

export { _XbuildEnv as XBuildENV };
