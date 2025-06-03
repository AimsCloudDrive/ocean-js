type DefineMessage = {
  defineMessage?: string | (() => string);
};
type NotStatic = { NotStatic?: boolean };
type NotInComponent = { NotInComponent?: boolean };
type NotClass = { NotClass?: boolean };
type NotSetter = { NotSetter?: boolean };
type NotMethod = { NotMethod?: boolean };
type NotAccessor = { NotAccessor?: boolean };
type NotProperty = { NotProperty?: boolean };

type DecoratorUsedErrorOption = DefineMessage &
  NotAccessor &
  NotMethod &
  NotStatic &
  NotInComponent &
  NotClass &
  NotProperty &
  NotSetter;

const onlyUsedMap = {
  observer: "observer decorator only be used with instance property.",
  option:
    "option decorator only be used with instance property or accessor property for setter.",
  component: "component decorator only be used with class.",
  computed:
    "computed decorator only be used with instance method or accessor property for getter.",
} as const;

function decoratorUsedErrorOptionHandler(
  decoratorName: keyof typeof onlyUsedMap,
  option: DecoratorUsedErrorOption
): string {
  const { defineMessage } = option;
  if (defineMessage) {
    return typeof defineMessage === "function"
      ? defineMessage()
      : defineMessage;
  }
  const should = ["(", onlyUsedMap[decoratorName], ")"] as const;
  let notIndex = "";
  if (option.NotStatic) {
    notIndex = "static property or method";
  } else if (option.NotInComponent) {
    notIndex = "outside a Component";
  } else if (option.NotSetter) {
    notIndex = "accessor property for not setter";
  } else if (option.NotMethod) {
    notIndex = "a instance method";
  } else if (option.NotAccessor) {
    notIndex = "accessor property";
  } else if (option.NotClass) {
    notIndex = "not a class";
  } else if (option.NotProperty) {
    notIndex = "a instance property";
  } else {
  }
  return `${notIndex ? `not allow used with ${notIndex}.` : ""} ${
    notIndex ? should.join("") : should[1]
  }`.trim();
}

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
class ObserverDUE extends Error {
  constructor(option: DecoratorUsedErrorOption = {}) {
    super(decoratorUsedErrorOptionHandler("observer", option));
  }
}
export const ObserverDecoratorUsedError: ObserverDecoratorUsedErrorConstructor =
  ObserverDUE;

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
class OptionDUE extends Error {
  constructor(option: DecoratorUsedErrorOption = {}) {
    super(decoratorUsedErrorOptionHandler("option", option));
  }
}
export const OptionDecoratorUsedError: OptionDecoratorUsedErrorConstructor =
  OptionDUE;

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
class ComponentDUE extends Error {
  constructor(option: DecoratorUsedErrorOption = {}) {
    super(decoratorUsedErrorOptionHandler("component", option));
  }
}
export const ComponentDecoratorUsedError: ComponentDecoratorUsedErrorConstructor =
  ComponentDUE;

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
class ComputedDUE extends Error {
  constructor(option: DecoratorUsedErrorOption = {}) {
    super(decoratorUsedErrorOptionHandler("computed", option));
  }
}
export const ComputedDecoratorUsedError: ComputedDecoratorUsedErrorConstructor =
  ComputedDUE;
