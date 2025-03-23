import { None, Option, Some } from "ts-features";
import {
  Expression,
  Identifier,
  isCallExpression,
  travel,
  TypeNode,
} from "@nn-lang/nn-language";

import { DeclarationScope, FileScope } from "./scope";
import { Size, TypeChecker, Value } from "..";

export interface Flow {
  calls: Set<Flow>;
  declaration: DeclarationScope;

  sizes: Size[];
  args: Value[];
  return?: Expression | Identifier;
  returnType?: TypeNode;
}

export namespace Flow {
  const _builtin = ["Trainable"];

  /**
   * Creates a new flow object from a declaration scope.
   *
   * Should be called **after** the sizes and values have been resolved.
   *
   * @param scope The declaration scope to create a flow from.
   * @returns A new flow object.
   */
  export function make(scope: DeclarationScope): Flow {
    const flow: Flow = {
      calls: new Set(),
      declaration: scope,

      sizes: [],
      args: [],
    };

    scope.flow = flow;
    return flow;
  }

  function _resolveInternal(
    scope: DeclarationScope,
    _context: TypeChecker
  ): void {
    const flow = scope.flow!;

    flow.sizes = scope.node.sizeDeclList
      ? scope.node.sizeDeclList.decls.map((decl) =>
          Size.find(scope, decl).unwrap()
        )
      : [];
    flow.args = scope.node.argumentList.args.map(
      (arg) => scope.values[arg.ident.value]
    );
    flow.return = scope.node.exprs.at(-1);
    flow.returnType = scope.node.returnType;
  }

  function _resolveCallInternal(
    scope: DeclarationScope,
    context: TypeChecker
  ): void {
    travel(scope.node, isCallExpression).forEach((callExpression) => {
      if (callExpression.callee.value === scope.declaration) {
        context.diagnostics.push({
          message: `Recursive call to '${scope.declaration}'.`,
          position: callExpression.callee.position,
        });
      } else if (callExpression.callee.value in scope.file.flows) {
        const callFlow = scope.file.flows[callExpression.callee.value];
        scope.flow!.calls.add(callFlow);
      } else if (!_builtin.includes(callExpression.callee.value)) {
        context.diagnostics.push({
          message: `Using undeclared flow name '${callExpression.callee.value}'.`,
          position: callExpression.callee.position,
        });
      }
    });
  }

  /**
   * Resolves the flows in a file scope.
   *
   * Expected diagnostic list:
   * - Using undeclared flow name
   * - Self-recursive call to flow
   *
   * @param scope the file scope to resolve the flows in.
   * @param diagnostics to add errors to.
   */
  export function resolve(scope: FileScope, context: TypeChecker): void {
    Object.values(scope.declarations).forEach((declaration) =>
      _resolveInternal(declaration, context)
    );

    Object.values(scope.declarations).forEach((declaration) =>
      _resolveCallInternal(declaration, context)
    );
  }

  /**
   * Utility function to find circular flows.
   *
   * @param flow
   * @returns None if no circular flows are found, Some with the circular flows list otherwise.
   */
  export function findCircular(flow: Flow): Option<Flow[]> {
    const flows: Flow[] = [];

    const visit = (flow: Flow): boolean => {
      if (flows.includes(flow)) return true;
      flows.push(flow);

      for (const callFlow of flow.calls) if (visit(callFlow)) return true;

      flows.pop();
      return false;
    };

    if (visit(flow)) {
      return Some(flows);
    }

    return None();
  }
}
