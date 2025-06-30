import { Flow, Size, TypeChecker, Value } from "..";

import { Workspace } from "@nn-lang/nn-language";

import { Scope } from "./scope";

/**
 * Resolves the names in the syntax tree.
 *
 * @param source the syntax tree to resolve names
 * @param path the path of the file
 * @param context the context of the checker
 */
export function resolve(workspace: Workspace, context: TypeChecker): void {
  context.scope = Scope.makeWorkspace(workspace);

  workspace.sources.forEach((source, path) => {
    const fileScope = Scope.makeFile(context.scope, path);
    context.scope.files[path] = fileScope;

    fileScope.flows = { ...context.globalFlows };

    source.declarations.forEach((decl) => {
      const scope = Scope.makeDeclaration(fileScope, decl);
      const flow = Flow.make(scope);

      fileScope.declarations[decl.name.value] = scope;
      fileScope.flows[decl.name.value] = flow;
    });

    Object.values(fileScope.declarations).flatMap((scope) =>
      Value.resolve(scope, context),
    );

    Object.values(fileScope.declarations).flatMap((scope) =>
      Size.resolve(scope, context),
    );
  });

  workspace.sources.forEach((_, path) => {
    const fileScope = context.scope.files[path]!;
    const dependencies = workspace.dependencyGraph.get(path) || [];

    dependencies.forEach(({ targetFileUri, dependency }) => {
      const targetScope = context.scope.files[targetFileUri];
      if (!targetScope)
        throw new Error(`Already checked file ${targetFileUri} not found`);

      dependency.idents.forEach(({ value, position, source }) => {
        const targetFlow = targetScope.flows[value];
        if (!targetFlow) {
          context.diagnostics.push({
            source,
            position,
            message: `File '${dependency.target}' has no member ${value}.`,
          });
        } else {
          fileScope.flows[value] = targetFlow;
        }
      });
    });
  });

  workspace.sources.forEach((_, path) => {
    const fileScope = context.scope.files[path]!;
    Flow.resolve(fileScope, context);

    Object.values(fileScope.declarations)
      .map((decl) => decl.node.name)
      .filter((name, index, names) => names.indexOf(name) !== index)
      .forEach((name) => {
        context.diagnostics.push({
          source: fileScope.file,
          message: `Duplicate function name '${name.value}'.`,
          position: name.position,
        });
        context.nonRecoverable = true;
      });

    Object.values(fileScope.flows).map((flow) => {
      const result = Flow.findCircular(flow);

      if (result.isSome()) {
        const flows = result.unwrap();

        context.diagnostics.push({
          source: fileScope.file,
          message: `Circular flow detected from '${flows
            .map((flow) => flow.declaration.declaration)
            .join(", ")}'.`,
          position: flows[0]!.declaration.node.position,
        });
        context.nonRecoverable = true;
      }
    });
  });
}

export * from "./scope";
export * from "./value";
export * from "./size";
export * from "./flow";
