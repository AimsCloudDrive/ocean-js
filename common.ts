import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { createFilter } from "@rollup/pluginutils";
import type { Plugin } from "rolldown";
export const xbuildExternal = [
  "fs",
  "jsdom",
  "path",
  "mongodb",
  "cors",
  "express",
  "url",
  "rolldown",
  "commander",
  "chalk",
  "tslib",
  "typescript",
  /^@rollup\//,
  /^@msom\//,
];

interface ClassDecoratorFirstPluginOptions {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
}

export function classDecoratorFirst(
  options: ClassDecoratorFirstPluginOptions = {}
): Plugin {
  const filter = createFilter(
    options.include ?? ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.jsx"],
    options.exclude ?? ["node_modules/**"]
  );

  return {
    name: "class-decorator-first",
    transform(code, id) {
      console.log("=================running==================");
      if (!filter(id)) return null;
      try {
        const ast = this.parse(code, {
          sourceType: "module",
          lang: "js",
        });

        traverse.default(ast, {
          ClassDeclaration(path) {
            const className = path.node.id?.name;
            if (!className) return;

            let classDecoratorCall: t.ExpressionStatement | null = null;
            const otherDecoratorCalls: t.ExpressionStatement[] = [];
            const toRemove: t.Node[] = [];

            // 收集当前类相关的所有装饰器调用
            let nextSibling = path.getNextSibling();
            while (
              nextSibling &&
              nextSibling.isExpressionStatement() &&
              t.isCallExpression(nextSibling.node.expression)
            ) {
              const callExpr = nextSibling.node.expression;

              // 检查是否是 __decorate 调用
              if (
                t.isIdentifier(callExpr.callee, { name: "__decorate" }) ||
                (t.isMemberExpression(callExpr.callee) &&
                  t.isIdentifier(callExpr.callee.object, { name: "tslib" }) &&
                  t.isIdentifier(callExpr.callee.property, {
                    name: "__decorate",
                  }))
              ) {
                const args = callExpr.arguments;

                // 识别类装饰器 (签名: [装饰器], 类名)
                if (
                  args.length === 2 &&
                  t.isIdentifier(args[1], { name: className })
                ) {
                  classDecoratorCall = nextSibling.node;
                  toRemove.push(nextSibling.node);
                }
                // 识别成员装饰器 (签名: [装饰器], 类名.prototype, ...)
                else if (
                  args.length >= 2 &&
                  t.isMemberExpression(args[1]) &&
                  t.isIdentifier(args[1].object, { name: className }) &&
                  t.isIdentifier(args[1].property, { name: "prototype" })
                ) {
                  otherDecoratorCalls.push(nextSibling.node);
                  toRemove.push(nextSibling.node);
                }
              }

              nextSibling = nextSibling.getNextSibling();
            }

            // 如果找到类装饰器，重新排序
            if (classDecoratorCall) {
              // 移除原始节点
              const body = path.parentPath.node.body as t.Statement[];
              path.parentPath.node.body = body.filter(
                (node) => !toRemove.includes(node)
              );

              // 按正确顺序重新插入：先类装饰器，后其他装饰器
              const insertIndex = body.indexOf(path.node) + 1;
              const newNodes = [classDecoratorCall, ...otherDecoratorCalls];

              body.splice(insertIndex, 0, ...newNodes);
            }
          },
        });

        const output = generate.default(ast, { retainLines: true }, code);
        return {
          code: output.code,
          map: output.map,
        };
      } catch (err) {
        console.error(`[class-decorator-first] Error processing ${id}:`, err);
        return null;
      }
    },
  };
}
