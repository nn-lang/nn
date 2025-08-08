import { Type, TypeChecker } from "..";

import { Edge } from "./edge";
import { Vertex } from "./vertex";

export function checker(context: TypeChecker) {
  Object.values(context.scope.files).forEach((fileScope) => {
    Object.values(fileScope.declarations).forEach((decl) =>
      Vertex.getAll(decl, context.vertices),
    );
  });

  Object.values(context.scope.files).forEach((fileScope) => {
    Object.values(fileScope.declarations).forEach((decl) =>
      Edge.getAll(decl, context.edges, context),
    );
  });

  let passedCount = 0,
    lastPassedCount = -1;

  while (
    passedCount < context.edges.length &&
    passedCount !== lastPassedCount
  ) {
    context.edges.forEach((edge) => Edge.solve(edge, context));

    lastPassedCount = passedCount;
    passedCount = context.edges.filter((edge) => edge.passed === true).length;
  }

  Object.values(context.scope.files)
    .flatMap((file) => Object.values(file.flows))
    .forEach((flow) => {
      if (!flow) return;

      if (flow.returnType && flow.return) {
        const left = Type.from(flow.returnType, flow.declaration);
        const right = context.vertices.get(flow.return!)!.type;

        if (right.isNone()) {
          return;
        }

        if (!Type.isSame(left, right.unwrap())) {
          context.diagnostics.push({
            source: flow.declaration.file.file,
            message: `Return type mismatch: ${Type.toString(
              left,
            )} != ${Type.toString(right.unwrap())}.`,
            position: flow.return!.position,
          });
        }
      }
    });
}

export * from "./vertex";
export * from "./edge";
export * from "./type";
export * from "./sizetype";
export * from "./polynomial";
