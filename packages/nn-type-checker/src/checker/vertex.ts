import { DeclarationScope, Value } from "../resolver";
import { None, Option, Some } from "ts-features";

import {
  Node,
  isAssignmentExpression,
  isCallExpression,
  isIdentifierExpression,
  travel,
} from "@nn-lang/nn-language";

import { Type } from "./type";

export interface Vertex {
  expression: Node;
  type: Option<Type>;
}

export namespace Vertex {
  /**
   * Creates a new vertex from an expression node.
   *
   * @param expression expression node to create a vertex from
   * @param type (optional) type of the vertex
   * @returns a new vertex
   */
  export function from(expression: Node, type: Option<Type>): Vertex {
    return {
      expression,
      type,
    };
  }

  /**
   * Gets all vertices from a given scope and adds them to the vertices map.
   *
   * @param scope scope to get vertices from
   * @param vertices map to add vertices to
   */
  export function getAll(
    scope: DeclarationScope,
    vertices: Map<Node, Vertex>,
  ): void {
    const reducer = (acc: Map<Node, Vertex>, vertex: Vertex) => {
      acc.set(vertex.expression, vertex);
      return acc;
    };

    scope.node.argumentList.args
      .map((arg) =>
        Vertex.from(arg.ident, Some(Type.from(arg.valueType, scope))),
      )
      .reduce(reducer, vertices);

    travel(scope.node, isCallExpression).forEach((expression) => {
      if (expression.callee.value === "Trainable") {
        vertices.set(expression, {
          expression,
          type: Some(Type.from(expression, scope)),
        });
      } else {
        vertices.set(expression, {
          expression,
          type: None(),
        });
      }
    });

    travel(scope.node, isAssignmentExpression).forEach((assignmentExpr) => {
      if (!vertices.has(assignmentExpr.right)) {
        return;
      }

      vertices.set(assignmentExpr, vertices.get(assignmentExpr.right)!);
      vertices.set(assignmentExpr.left, vertices.get(assignmentExpr.right)!);
    });

    travel(scope.node, isIdentifierExpression).forEach((expression) => {
      const value = Value.find(scope, expression.ident).unwrap();
      vertices.set(expression, vertices.get(value.first)!);
    });
  }
}
