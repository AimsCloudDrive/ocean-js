import Plugin from '../types/plugin';
import ts from 'typescript';

function createTypeScriptPlugin(): Plugin {
  return {
    name: 'typescript-plugin',
    order: 0,
    transform(code: string, id: string) {
      if (id.endsWith('.ts') || id.endsWith('.tsx')) {
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2015,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          }
        });
        return result.outputText;
      }
      return null;
    }
  };
}

export default createTypeScriptPlugin;