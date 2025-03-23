import { SourceFile } from "@nn-lang/nn-language";

import { Scope } from "./scope";
import { Flow, Size, TypeChecker, Value } from "..";

/**
 * Resolves the names in the syntax tree.
 * 
 * @param source the syntax tree to resolve names
 * @param path the path of the file
 * @param context the context of the checker
 */
export function resolve(source: SourceFile, context: TypeChecker): void {
  context.scope = Scope.makeFile(source.path);
  context.scope.flows = { ...context.globalFlows };

  source.tree.forEach(decl => {
    const scope = Scope.makeDeclaration(context.scope, decl);
    const flow = Flow.make(scope);

    context.scope.declarations[decl.name.value] = scope;
    context.scope.flows[decl.name.value] = flow;
  });

  Object
    .values(context.scope.declarations)
    .flatMap((scope) => Value.resolve(scope, context));

  Object
    .values(context.scope.declarations)
    .flatMap((scope) => Size.resolve(scope, context));

  Flow.resolve(context.scope, context);

  Object
    .values(context.scope.declarations)
    .map(decl => decl.node.name)
    .filter((name, index, names) => names.indexOf(name) !== index)
    .forEach(name => {
      context.diagnostics.push({
        message: `Duplicate function name '${name.value}'.`,
        position: name.position
      })
      context.nonRecoverable = true;
    });

  Object
    .values(context.scope.flows)
    .map((flow) => {
      const result = Flow.findCircular(flow);

      if (result.is_some()) {
        const flows = result.unwrap();

        context.diagnostics.push({
          message: `Circular flow detected from '${flows.map(flow => flow.declaration.declaration).join(', ')}'.`,
          position: flows[0].declaration.node.position
        });
        context.nonRecoverable = true;
      }
    });
}

export * from './scope'
export * from './value'
export * from './size'
export * from './flow'
