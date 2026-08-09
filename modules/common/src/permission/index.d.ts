export interface IPermission<P extends {
    [K in string]: number;
}> {
    has(...permissions: (keyof P)[]): boolean;
    add(...permissions: (keyof P)[]): this;
    remove(...permissions: (keyof P)[]): this;
    get<Ps extends (keyof P)[]>(...permissions: Ps): {
        [k in Ps extends [] ? keyof P : Ps[number]]: boolean;
    };
}
export declare const createPermission: <P extends { [K in string]: number; }>(permissionState: P) => {
    new (permission?: number): {
        permission: number;
        readonly permissionState: P;
        parsePermissions<Ps extends (keyof P)[]>(permissions: Ps, force?: boolean): Ps;
        has(...permissions: (keyof P)[]): boolean;
        add(...permissions: (keyof P)[]): /*elided*/ any;
        remove(...permissions: (keyof P)[]): /*elided*/ any;
        get<Ps extends (keyof P)[]>(...permissions: Ps): { [k in Ps extends [] ? keyof P : Ps[number]]: boolean; };
    };
    from(flag: number | IPermission<P>): {
        permission: number;
        readonly permissionState: P;
        parsePermissions<Ps extends (keyof P)[]>(permissions: Ps, force?: boolean): Ps;
        has(...permissions: (keyof P)[]): boolean;
        add(...permissions: (keyof P)[]): any;
        remove(...permissions: (keyof P)[]): any;
        get<Ps extends (keyof P)[]>(...permissions: Ps): { [k in Ps extends [] ? keyof P : Ps[number]]: boolean; };
    };
};
