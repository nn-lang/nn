import { None, Option, Result, Some, err, ok } from "ts-features";

import {
  CallExpression,
  Diagnostic,
  Node,
  Workspace,
} from "@nn-lang/nn-language";

import { Type, Vertex, checker } from "./checker";
import { Callee, Edge } from "./checker/edge";
import { Flow, WorkspaceScope, resolve } from "./resolver";

export * from "./resolver";
export * from "./checker";

export interface TypeChecker {
  scope: WorkspaceScope;

  globalFlows: Record<string, Flow>;
  vertices: Map<Node, Vertex>;
  edges: Edge[];

  diagnostics: Diagnostic[];
  nonRecoverable: boolean;

  _internal: {
    calleeMap: Map<Flow, Callee>;
  };
}

export namespace TypeChecker {
  /**
   * Check the syntax tree and return the type checker object
   *
   * @param source the source file object to check
   * @returns the type checker object
   */
  export function check(workspace: Workspace): TypeChecker {
    const context: TypeChecker = {
      scope: {} as WorkspaceScope,

      globalFlows: {},
      vertices: new Map(),
      edges: [],

      diagnostics: [],
      nonRecoverable: false,

      _internal: {
        calleeMap: new Map(),
      },
    };

    resolve(workspace, context);
    if (context.nonRecoverable) {
      return context;
    }

    checker(context);
    return context;
  }

  export enum GetTypeError {
    NodeHasNoType = "Node has no type",
    NodeIsNotVertex = "Node is not a vertex",
  }

  /**
   *
   * @param node the target node
   * @param checker the type checker object
   * @returns Some if the node has a type, None
   */
  export function getType(
    node: Node,
    checker: TypeChecker,
  ): Result<Type, GetTypeError> {
    return checker.vertices.has(node)
      ? checker.vertices.get(node)!.type.mapOrElse<Result<Type, GetTypeError>>(
          () => err(GetTypeError.NodeHasNoType),
          (type) => ok(type),
        )
      : err(GetTypeError.NodeIsNotVertex);
  }

  /**
   *
   * @param node the target call expression node
   * @param checker the type checker object
   * @returns the edge object
   */
  export function getEdge(
    node: CallExpression,
    checker: TypeChecker,
  ): Option<Edge> {
    const edge = checker.edges.find((edge) => edge.toSolve.expression === node);

    return edge ? Some(edge) : None();
  }
}
