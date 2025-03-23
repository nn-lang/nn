import { None, Option, Some } from "ts-features";
import { Identifier, isIdentifierSizeNode, Node, travel } from "@nn-lang/nn-language";

import { DeclarationScope } from "./scope";
import { TypeChecker } from "..";

export interface Size {
  scope: DeclarationScope;
  ident: string;

  nodes: Set<Node>;
  first: Node;
}

export namespace Size {

  /**
   * Finds a size in a declaration scope.
   * 
   * @param scope the declaration scope to search in
   * @param ident the identifier to search for
   * @returns None if the size is not found, Some(Size) if it is found
   */
  export function find(scope: DeclarationScope, ident: Identifier): Option<Size> {
    return ident.value in scope.sizes
      ? Some(scope.sizes[ident.value])
      : None();
  }

  /**
   * Creates a new size object from an identifier.
   * 
   * @param scope the declaration scope to create the size in
   * @param ident the identifier to create the size from
   * @returns a new size object
   */
  export function make(scope: DeclarationScope, ident: Identifier): Size {
    return {
      scope,
      ident: ident.value,

      nodes: new Set([ident]),
      first: ident,
    };
  }

  /**
   * Resolves sizes in a declaration scope.
   * 
   * @param scope to resolve sizes in
   * @param diagnostics to add errors to
   */
  export function resolve(scope: DeclarationScope, context: TypeChecker): void {
    scope.node.sizeDeclList && scope.node.sizeDeclList.decls
      .forEach(size => {
        scope.sizes[size.value] = make(scope, size);
      });

    travel(scope.node.argumentList, isIdentifierSizeNode)
      .forEach(sizeNode =>
        find(scope, sizeNode.ident)
          .map_or_else<unknown>(
            () => scope.sizes[sizeNode.ident.value] = make(scope, sizeNode.ident),
            (size) => size.nodes.add(sizeNode),
          )
      );

    scope.node.returnType && travel(scope.node, isIdentifierSizeNode)
      .forEach(sizeNode =>
        find(scope, sizeNode.ident)
          .map_or_else<unknown>(
            () => {
              context.diagnostics.push({
                message: `Using undeclared size name '${sizeNode.ident.value}'.`,
                position: sizeNode.position
              })
              context.nonRecoverable = true;
            },
            (size) => size.nodes.add(sizeNode)
          )
      );

    travel(scope.node.exprs, isIdentifierSizeNode)
      .forEach(sizeNode =>
        find(scope, sizeNode.ident)
          .map_or_else<unknown>(
            () => {
              context.diagnostics.push({
                message: `Using undeclared size name '${sizeNode.ident.value}'.`,
                position: sizeNode.position
              })
              context.nonRecoverable = true;
            },
            (size) => size.nodes.add(sizeNode)
          )
      );
  }

}
