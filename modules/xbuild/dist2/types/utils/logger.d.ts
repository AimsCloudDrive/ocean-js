export declare class Logger {
    private prefix;
    constructor(prefix: string);
    private log;
    info: LeveLCall;
    warn: LeveLCall;
    error: LeveLCall;
    success: LeveLCall;
    progress(message: string, current: number, total: number): void;
}
interface LeveLCall {
    (message: string, ...args: any[]): void;
}
export {};
