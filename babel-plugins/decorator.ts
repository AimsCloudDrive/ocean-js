import { types as t } from "@babel/core";
import { NodePath, Visitor } from "@babel/traverse";
import {
  ClassDeclaration,
  ClassExpression,
  ClassMethod,
  ClassProperty,
  Decorator,
  Identifier,
  StringLiteral,
  PrivateName,
} from "@babel/types";

interface DecoratorQueueItem {
  type: "property" | "accessor" | "method";
  kinds?: string[];
  kind?: string;
}

interface ClassElement {
  decorators?: Decorator[] | null;
  static?: boolean;
  key: Identifier | StringLiteral | PrivateName;
  kind?: string;
}

function transformClass(
  path: NodePath<ClassDeclaration | ClassExpression>
): void {
  const { node } = path;
  console.log("node.decorators--->", node.decorators);
  if (
    !node.decorators?.length &&
    !hasClassElementDecorators(node.body.body as any)
  ) {
    return;
  }

  const tempClassId = path.scope.generateUidIdentifier("_cls");
  const statements: any[] = [];

  statements.push(t.variableDeclarator(tempClassId, buildClassNode(node)));

  if (node.decorators) {
    node.decorators.reverse().forEach((decorator) => {
      statements.push(
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            tempClassId,
            t.logicalExpression(
              "||",
              t.callExpression(decorator.expression, [tempClassId]),
              tempClassId
            )
          )
        )
      );
    });
  }

  const decoratorApplies: Array<() => any> = [];
  const body = node.body.body;

  const decoratorsQueue: DecoratorQueueItem[] = [
    { type: "property", kind: "property" },
    { type: "accessor", kinds: ["get", "set"] },
    { type: "method", kind: "method" },
  ];

  decoratorsQueue.forEach(({ type, kinds, kind }) => {
    body.forEach((_element) => {
      const element = _element as ClassElement;
      if (!element.decorators) return;

      let shouldProcess = false;
      if (type === "property" && t.isClassProperty(_element)) {
        shouldProcess = true;
      } else if (
        type === "accessor" &&
        t.isClassMethod(element as ClassMethod) &&
        (kinds || []).includes((element as ClassMethod).kind)
      ) {
        shouldProcess = true;
      } else if (
        type === "method" &&
        t.isClassMethod(element as ClassMethod) &&
        (element as ClassMethod).kind === "method"
      ) {
        shouldProcess = true;
      }

      if (shouldProcess) {
        element.decorators.reverse().forEach((decorator) => {
          decoratorApplies.push(() => {
            const prototype = element.static
              ? tempClassId
              : t.memberExpression(tempClassId, t.identifier("prototype"));
            const name = getElementName(element);
            const descriptor = t.callExpression(
              t.memberExpression(
                t.identifier("Object"),
                t.identifier("getOwnPropertyDescriptor")
              ),
              [prototype, t.stringLiteral(name)]
            );

            const contextProperties = [
              t.objectProperty(
                t.identifier("kind"),
                type === "accessor"
                  ? t.stringLiteral((element as ClassMethod).kind)
                  : t.stringLiteral(kind!)
              ),
              t.objectProperty(t.identifier("name"), t.stringLiteral(name)),
              t.objectProperty(t.identifier("descriptor"), descriptor),
              t.objectProperty(
                t.identifier("static"),
                t.booleanLiteral(!!element.static)
              ),
              t.objectProperty(
                t.identifier("private"),
                t.booleanLiteral(
                  (() => {
                    const key = element.key;
                    if (t.isPrivateName(key)) {
                      return true;
                    } else if (t.isIdentifier(key)) {
                      return key.name.startsWith("#");
                    } else if (t.isStringLiteral(key)) {
                      return key.value.startsWith("#");
                    } else {
                      return false;
                    }
                  })()
                )
              ),
            ];

            const context = t.objectExpression(contextProperties);
            const decoratorCall = t.callExpression(decorator.expression, [
              prototype,
              context,
            ]);

            return t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(prototype, t.identifier(name)),
                t.conditionalExpression(
                  t.binaryExpression(
                    "!==",
                    t.identifier("desc"),
                    t.identifier("undefined")
                  ),
                  t.identifier("desc"),
                  t.memberExpression(prototype, t.identifier(name))
                )
              )
            );
          });
        });
      }
    });
  });

  decoratorApplies.forEach((apply) => {
    statements.push(apply());
  });

  const iife = t.callExpression(
    t.arrowFunctionExpression(
      [],
      t.blockStatement([
        t.variableDeclaration("let", [statements[0]]),
        ...statements.slice(1).map((s) => t.expressionStatement(s.expression)),
        t.returnStatement(tempClassId),
      ])
    ),
    []
  );

  path.replaceWith(
    t.variableDeclaration("const", [
      t.variableDeclarator(node.id || t.identifier("_AnonymousClass"), iife),
    ])
  );
}

function buildClassNode(node: ClassDeclaration | ClassExpression) {
  return t.classExpression(
    node.id,
    node.superClass,
    t.classBody(
      node.body.body.map((element) => {
        const newElement = t.cloneNode(element);
        Reflect.set(newElement, "decorators", null, newElement);
        return newElement;
      })
    )
  );
}

function getElementName(element: ClassElement): string {
  return t.isIdentifier(element.key)
    ? element.key.name
    : t.isStringLiteral(element.key)
    ? element.key.value
    : "";
}

function hasClassElementDecorators(elements: ClassElement[]): boolean {
  return elements.some((el) => el.decorators && el.decorators.length > 0);
}

export default function createDecoratorPlugin() {
  return {
    name: "custom-decorators-plugin",
    visitor: {
      ClassDeclaration(path: NodePath<ClassDeclaration>) {
        transformClass(path);
      },
      ClassExpression(path: NodePath<ClassExpression>) {
        transformClass(path);
      },
    } as Visitor,
  };
}
