import { types as babelTypes } from "@babel/core";

/**
 * 更新装饰器的顺序，将类的装饰器先于其他装饰器运行
 * @returns
 */
export default function createDecoratorPlugin() {
  return {
    name: "custom-decorators-plugin",
    visitor: {
      Program(path: any) {
        const programBody = path.node.body;
        // 判断是否有装饰器语法，__decorate函数的使用
        if (!Array.isArray(programBody)) {
          return;
        }
        const decorators: any[] = [];
        let changed = false;
        const newBody: any[] = [];
        const cleanDecorators = () => {
          if (decorators.length) {
            newBody.push(...decorators);
            decorators.length = 0;
          }
        };
        programBody.forEach((node) => {
          if (babelTypes.isExpressionStatement(node)) {
            const expression = node.expression;
            if (babelTypes.isCallExpression(expression)) {
              const callee = expression.callee;
              if (
                babelTypes.isIdentifier(callee) &&
                callee.name === "__decorate"
              ) {
                /* 普通装饰器 __decorate([  _property, __metadata("design:type", Object) ], AAA.prototype, "AAA", void 0); */
                decorators.push(node);
                changed = true;
                return;
              }
            }
            if (babelTypes.isAssignmentExpression(expression)) {
              const right = expression.right;
              if (babelTypes.isCallExpression(right)) {
                const callee = right.callee;
                if (
                  babelTypes.isIdentifier(callee) &&
                  callee.name === "__decorate"
                ) {
                  /* 类装饰器 AAA = __decorate([ _class ], AAA); */
                  newBody.push(node, ...decorators);
                  decorators.length = 0;
                  changed = true;
                  return;
                }
              }
            }
          }
          // 当前不是装饰器的声明，表示上一个类的装饰器已经声明完成，检查是否有未添加的装饰器声明
          cleanDecorators();
          newBody.push(node);
        });
        // 防止最后一段body是普通装饰器声明
        cleanDecorators();
        changed && (path.node.body = newBody);
      },
    },
  };
}
