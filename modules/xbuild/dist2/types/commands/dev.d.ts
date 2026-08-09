import { XbuildDevOptions } from "../core/types";
interface DevCommandOption extends Pick<XbuildDevOptions, "port" | "public"> {
    config?: string;
}
export declare function devCommand(options: DevCommandOption): Promise<void>;
export {};
