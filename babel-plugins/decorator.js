// 类装饰器接收一个参数，参数为类的构造器
// 属性装饰器接收两个参数，参数一为类的原型，参数二为上下文对象，包含kind（property）、name（属性名）、descriptor（属性描述符）、static（是否静态）、private（是否私有），
// 访问器装饰器接收两个参数，参数一为类的原型，参数二为上下文对象，包含kind（get|set）、name（属性名）、descriptor（属性描述符）、static（是否静态）、private（是否私有），
// 方法装饰器接收两个参数，参数一为类的原型，参数二为上下文对象，包含kind（method）、name（方法名）、descriptor（属性描述符）、static（是否静态）、private（是否私有），
// 运行顺序：同一个类的所有装饰器，类装饰器>属性装饰器>访问器装饰器>方法装饰器
console.log("-----defin decorator");
// @ts-nocheck
const { types: t } = require("@babel/core");

function createDecoratorPlugin() {
  return {
    name: "custom-decorators-plugin",
    visitor: {
      ClassDeclaration(path) {
        transformClass(path);
      },
      ClassExpression(path) {
        transformClass(path);
      },
    },
  };
}

function transformClass(path) {
  const { node } = path;
  if (!node.decorators && !hasClassElementDecorators(node.body.body)) return;

  const tempClassId = path.scope.generateUidIdentifier("_cls");
  const statements = [];

  // 初始化临时类变量
  statements.push(t.variableDeclarator(tempClassId, buildClassNode(node)));

  // 处理类装饰器
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

  // 收集装饰器应用
  const decoratorApplies = [];
  const body = node.body.body;

  // 按类型收集装饰器
  const decoratorsQueue = [
    { type: "property", kind: "property" },
    { type: "accessor", kinds: ["get", "set"] },
    { type: "method", kind: "method" },
  ];

  decoratorsQueue.forEach(({ type, kinds, kind }) => {
    body.forEach((element) => {
      if (!element.decorators) return;

      let shouldProcess = false;
      if (type === "property" && t.isClassProperty(element)) {
        shouldProcess = true;
      } else if (
        type === "accessor" &&
        t.isClassMethod(element) &&
        (kinds || []).includes(element.kind)
      ) {
        shouldProcess = true;
      } else if (
        type === "method" &&
        t.isClassMethod(element) &&
        element.kind === "method"
      ) {
        shouldProcess = true;
      }

      if (shouldProcess) {
        element.decorators.reverse().forEach((decorator) => {
          decoratorApplies.push(() => {
            const prototype = t.memberExpression(
              tempClassId,
              t.identifier("prototype")
            );
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
                  ? t.stringLiteral(element.kind)
                  : t.stringLiteral(kind)
              ),
              t.objectProperty(t.identifier("name"), t.stringLiteral(name)),
              t.objectProperty(t.identifier("descriptor"), descriptor),
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

  // 生成装饰器应用代码
  decoratorApplies.forEach((apply) => {
    statements.push(apply());
  });

  // 构建最终表达式
  const iife = t.callExpression(
    t.arrowFunctionExpression(
      [],
      t.blockStatement([
        t.variableDeclaration("let", [statements[0]]),
        ...statements.slice(1).map((s) => t.expressionStatement(s.expression)),
        t.returnStatement(tempClassId),
      ]),
      []
    )
  );

  path.replaceWith(
    t.variableDeclaration("const", [
      t.variableDeclarator(node.id || t.identifier("_AnonymousClass"), iife),
    ])
  );
}

function buildClassNode(node) {
  return t.classExpression(
    node.id,
    node.superClass,
    t.classBody(
      node.body.body.map((element) => {
        const newElement = t.cloneNode(element);
        newElement.decorators = null;
        return newElement;
      })
    )
  );
}

function getElementName(element) {
  return t.isIdentifier(element.key)
    ? element.key.name
    : t.isStringLiteral(element.key)
    ? element.key.value
    : "";
}

function hasClassElementDecorators(elements) {
  return elements.some((el) => el.decorators && el.decorators.length > 0);
}

module.exports = createDecoratorPlugin;
