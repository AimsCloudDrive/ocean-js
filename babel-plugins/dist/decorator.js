import { types as babelTypes } from "@babel/core";
/**
 * 更新装饰器的顺序，将类的装饰器先于其他装饰器运行
 * @returns
 */
export default function createDecoratorPlugin() {
    return {
        name: "custom-decorators-plugin",
        visitor: {
            Program(path) {
                const programBody = path.node.body;
                // 判断是否有装饰器语法，__decorate函数的使用
                if (!Array.isArray(programBody)) {
                    return;
                }
                const decorators = [];
                let changed = false;
                const newBody = [];
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
                            if (babelTypes.isIdentifier(callee) &&
                                callee.name === "__decorate") {
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
                                if (babelTypes.isIdentifier(callee) &&
                                    callee.name === "__decorate") {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vZGVjb3JhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWxEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxPQUFPLFVBQVUscUJBQXFCO0lBQzNDLE9BQU87UUFDTCxJQUFJLEVBQUUsMEJBQTBCO1FBQ2hDLE9BQU8sRUFBRTtZQUNQLE9BQU8sQ0FBQyxJQUFTO2dCQUNmLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNuQyw2QkFBNkI7Z0JBQzdCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUMvQixPQUFPO2lCQUNSO2dCQUNELE1BQU0sVUFBVSxHQUFVLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixNQUFNLE9BQU8sR0FBVSxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtvQkFDM0IsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFO3dCQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUM7d0JBQzVCLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3FCQUN2QjtnQkFDSCxDQUFDLENBQUM7Z0JBQ0YsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUMzQixJQUFJLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQzt3QkFDbkMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUU7NEJBQzNDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQ2pDLElBQ0UsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7Z0NBQy9CLE1BQU0sQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUM1QjtnQ0FDQSx3R0FBd0c7Z0NBQ3hHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ3RCLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0NBQ2YsT0FBTzs2QkFDUjt5QkFDRjt3QkFDRCxJQUFJLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRTs0QkFDakQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQzs0QkFDL0IsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0NBQ3RDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0NBQzVCLElBQ0UsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7b0NBQy9CLE1BQU0sQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUM1QjtvQ0FDQSw2Q0FBNkM7b0NBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsVUFBVSxDQUFDLENBQUM7b0NBQ2xDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29DQUN0QixPQUFPLEdBQUcsSUFBSSxDQUFDO29DQUNmLE9BQU87aUNBQ1I7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsNkNBQTZDO29CQUM3QyxlQUFlLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gscUJBQXFCO2dCQUNyQixlQUFlLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFDeEMsQ0FBQztTQUNGO0tBQ0YsQ0FBQztBQUNKLENBQUMifQ==