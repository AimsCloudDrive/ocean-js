export type ClassFunction = new (...args: unknown[]) => unknown;

export type Decorator =
  | MethodDecorator
  | ClassDecorator
  | ParameterDecorator
  | PropertyDecorator
  | AccessorDecorator;
export type ClassDecorator = <TFunction extends ClassFunction = ClassFunction>(
  target: TFunction,
  context: ClassDecoratorContext<TFunction>
) => TFunction | void;
export type PropertyDecorator = (
  target: object,
  context: ClassFieldDecoratorContext
) => void;
export type AccessorDecorator = (
  target: object,
  context: ClassAccessorDecoratorContext
) => void;
export type MethodDecorator = (
  target: object,
  context: ClassMethodDecoratorContext
) => void;
