import { XBuildMode } from "../core";
declare class XBuildENV {
    private envKey;
    constructor(envKey: string | symbol);
    get env(): XBuildMode;
    to(mode: XBuildMode): void;
    reset(): void;
}
declare const _XbuildEnv: XBuildENV;
export { _XbuildEnv as XBuildENV };
