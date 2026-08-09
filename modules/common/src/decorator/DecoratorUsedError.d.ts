type DefineMessage = {
    defineMessage?: string | (() => string);
};
type NotStatic = {
    NotStatic?: boolean;
};
type NotInComponent = {
    NotInComponent?: boolean;
};
type NotClass = {
    NotClass?: boolean;
};
type NotSetter = {
    NotSetter?: boolean;
};
type NotMethod = {
    NotMethod?: boolean;
};
type NotAccessor = {
    NotAccessor?: boolean;
};
type NotProperty = {
    NotProperty?: boolean;
};
type DecoratorUsedErrorOption = DefineMessage & NotAccessor & NotMethod & NotStatic & NotInComponent & NotClass & NotProperty & NotSetter;
/**
 * interface: ObserverDecoratorUsedErrorConstructor
 */
interface ObserverDecoratorUsedErrorConstructor {
    new (option?: DefineMessage): ObserverDUE;
    new (option?: NotStatic): ObserverDUE;
    new (option?: NotAccessor): ObserverDUE;
    new (option?: NotMethod): ObserverDUE;
    readonly prototype: ObserverDUE;
}
/**
 * class: ObserverDUE
 */
declare class ObserverDUE extends Error {
    constructor(option?: DecoratorUsedErrorOption);
}
export declare const ObserverDecoratorUsedError: ObserverDecoratorUsedErrorConstructor;
/**
 * interface: OptionDecoratorUsedErrorConstructor
 */
interface OptionDecoratorUsedErrorConstructor {
    new (option?: DefineMessage): OptionDUE;
    new (option?: NotStatic): OptionDUE;
    new (option?: NotInComponent): OptionDUE;
    new (option?: NotSetter): OptionDUE;
    new (option?: NotMethod): OptionDUE;
    readonly prototype: OptionDUE;
}
/**
 * class: OptionDUE
 */
declare class OptionDUE extends Error {
    constructor(option?: DecoratorUsedErrorOption);
}
export declare const OptionDecoratorUsedError: OptionDecoratorUsedErrorConstructor;
/**
 * interface: ComponentDecoratorUsedErrorConstructor
 */
interface ComponentDecoratorUsedErrorConstructor {
    new (option?: DefineMessage): ComponentDUE;
    new (option?: NotClass): ComponentDUE;
    readonly prototype: ComponentDUE;
}
/**
 * class: ComponentDUE
 */
declare class ComponentDUE extends Error {
    constructor(option?: DecoratorUsedErrorOption);
}
export declare const ComponentDecoratorUsedError: ComponentDecoratorUsedErrorConstructor;
/**
 * interface: ComputedDecoratorUsedErrorConstructor
 */
interface ComputedDecoratorUsedErrorConstructor {
    new (option?: DefineMessage): ComputedDUE;
    new (option?: NotStatic): ComputedDUE;
    new (option?: NotProperty): ComputedDUE;
    readonly prototype: ComputedDUE;
}
/**
 * class: ComputedDUE
 */
declare class ComputedDUE extends Error {
    constructor(option?: DecoratorUsedErrorOption);
}
export declare const ComputedDecoratorUsedError: ComputedDecoratorUsedErrorConstructor;
export {};
