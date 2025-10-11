export interface IPermission<P extends { [K in string]: number }> {
  has(...permissions: (keyof P)[]): boolean;
  add(...permissions: (keyof P)[]): this;
  remove(...permissions: (keyof P)[]): this;
  get<Ps extends (keyof P)[]>(
    ...permissions: Ps
  ): {
    [k in Ps extends [] ? keyof P : Ps[number]]: boolean;
  };
}

export const createPermission = <P extends { [K in string]: number }>(
  permissionState: P
) => {
  return class Permission implements IPermission<P> {
    permission: number;
    readonly permissionState: P;

    static from(flag: number | IPermission<P>): Permission {
      if (typeof flag === "number") {
        return new this(flag);
      }
      if (flag instanceof this) {
        return flag;
      }
      throw TypeError("unknow permission");
    }

    constructor(permission: number = 0) {
      this.permission = permission;
      this.permissionState = permissionState;
    }

    #parsePermissions<Ps extends (keyof P)[]>(
      permissions: Ps,
      force?: boolean
    ): Ps {
      const keys = new Set(
        Reflect.ownKeys(this.permissionState) as Iterable<Ps[number]>
      );
      const res = [] as unknown as Ps;
      if (permissions.length === 0 && force) {
        return Array.from(keys) as Ps;
      }
      for (const permission of permissions) {
        if (!keys.has(permission)) {
          throw TypeError(
            'unknown permission: "' + Object(permission).toString + '"'
          );
        }
        res.push(permission);
      }
      return res;
    }

    has(...permissions: (keyof P)[]): boolean {
      permissions = this.#parsePermissions(permissions);
      return permissions.every(
        (permission) => this.permission & this.permissionState[permission]
      );
    }
    add(...permissions: (keyof P)[]): this {
      permissions = this.#parsePermissions(permissions);
      this.permission |= permissions.reduce(
        (acc, permission) => acc | this.permissionState[permission],
        0
      );
      return this;
    }
    remove(...permissions: (keyof P)[]): this {
      permissions = this.#parsePermissions(permissions);
      this.permission &= ~permissions.reduce(
        (acc, permission) => acc | this.permissionState[permission],
        0
      );
      return this;
    }
    get<Ps extends (keyof P)[]>(
      ...permissions: Ps
    ): { [k in Ps extends [] ? keyof P : Ps[number]]: boolean } {
      permissions = this.#parsePermissions(permissions, true);
      return permissions.reduce(
        (acc, permission) => ({ ...acc, [permission]: this.has(permission) }),
        {} as { [k in Ps extends [] ? keyof P : Ps[number]]: boolean }
      );
    }
  };
};
