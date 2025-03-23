import { onnx } from "onnx-proto";

import {
  AssignmentExpression,
  CallExpression,
  Declaration,
  Expression,
  isAssignmentExpression,
  isCallExpression,
  isIdentifierExpression,
  isStringLiteralExpression,
  isTupleExpression,
} from "@nn-lang/nn-language";
import { Flow, Polynomial, Size, TypeChecker } from "@nn-lang/nn-type-checker";
import { DEFAULT_OPSET_IMPORTS } from ".";

export const ONNX_NN_DOMAIN = new onnx.OperatorSetIdProto({
  domain: "nn",
  version: 1,
});

interface OnnxContext {
  checker: TypeChecker;

  temporaryNameRecord: Map<CallExpression, string>;
  _nextTemporaryIndex: number;

  sizeMap: Record<string, number>;
}

export function declaration(
  decl: Declaration,
  context: OnnxContext
): onnx.FunctionProto {
  const [input, output, nodes] = declarationNodes(decl, context);

  return new onnx.FunctionProto({
    name: decl.name.value,
    domain: "nn",
    input,
    output,
    node: nodes,
    opsetImport: [...DEFAULT_OPSET_IMPORTS, ONNX_NN_DOMAIN],
  });
}

export function declarationNodes(
  decl: Declaration,
  context: OnnxContext
): [input: string[], output: string[], nodes: onnx.NodeProto[]] {
  const declArgs = decl.argumentList.args.map((arg) => arg.ident.value);
  let args = decl.firstPipe ? [...declArgs] : [];

  const result: onnx.NodeProto[] = [];

  for (const expr of decl.exprs) {
    if (isAssignmentExpression(expr)) {
      const [outputs, node] = assign(expr, args, context);
      result.push(node);
      args = outputs;
    }

    if (isCallExpression(expr)) {
      const [outputs, node] = call(expr, args, context);
      result.push(node);
      args = outputs;
    }

    if (isTupleExpression(expr)) {
      const [first, ...rest] = expr.elements;

      if (!isCallExpression(first)) {
        throw new Error("Unreachable");
      }

      const [outputs, node] = call(first, args, context);
      result.push(node);

      for (const expr of rest) {
        if (isIdentifierExpression(expr)) {
          outputs.push(expr.ident.value);
          continue;
        }

        if (isCallExpression(expr)) {
          const [callOutputs, node] = call(expr, args, context);
          result.push(node);
          outputs.push(...callOutputs);
          continue;
        }

        throw new Error("Unreachable");
      }

      args = outputs;
    }
  }

  return [declArgs, args, result];
}

export function expressionName(expr: Expression, context: OnnxContext): string {
  if (isAssignmentExpression(expr)) {
    throw new Error("Unreachable");
  }

  if (isIdentifierExpression(expr)) {
    return expr.ident.value;
  }

  if (isTupleExpression(expr)) {
    throw new Error("Unreachable");
  }

  if (isCallExpression(expr)) {
    if (context.temporaryNameRecord.has(expr)) {
      return context.temporaryNameRecord.get(expr)!;
    }

    const name = `temp_${context._nextTemporaryIndex}`;
    context._nextTemporaryIndex++;
    context.temporaryNameRecord.set(expr, name);

    return name;
  }

  if (isStringLiteralExpression(expr)) {
    throw new Error("Unreachable");
  }

  throw new Error("Unreachable");
}

export function assign(
  expr: AssignmentExpression,
  prevArgs: string[],
  context: OnnxContext
): [string[], onnx.NodeProto] {
  if (!isCallExpression(expr.right)) {
    throw new Error("Unreachable");
  }

  const callExpr = expr.right;

  const result = new onnx.NodeProto({
    opType: callExpr.callee.value,
    domain: "nn",
    input: [
      ...prevArgs,
      ...callExpr.args.map((e) => expressionName(e, context)),
    ],
    output: [expr.left.value],
  });

  return [result.output, result];
}

export function call(
  expr: CallExpression,
  prevArgs: string[],
  context: OnnxContext
): [string[], onnx.NodeProto] {
  const result = new onnx.NodeProto({
    opType: expr.callee.value,
    domain: "nn",
    input: [...prevArgs, ...expr.args.map((e) => expressionName(e, context))],
    output: [expressionName(expr, context)],
  });

  return [result.output, result];
}

export function tensorShape(
  flow: Flow,
  context: OnnxContext
): [onnx.TypeProto[], onnx.TypeProto] {
  const sizeMap = Object.entries(flow.declaration.sizes).reduce(
    (prev, [ident, size]) => {
      if (!context.sizeMap[ident]) {
        throw new Error(`Size ${ident} not found`);
      }

      prev.set(size, Polynomial.constant(context.sizeMap[ident]));
      return prev;
    },
    new Map<Size, Polynomial>()
  );

  const inputs = flow.args.map((v) => {
    const type = TypeChecker.getType(v.first, context.checker).unwrap();

    const assigned = type.shape
      .map((s) => Polynomial.from(s))
      .map((p) => Polynomial.assign(p, sizeMap));

    return new onnx.TypeProto({
      tensorType: {
        elemType: onnx.TensorProto.DataType.FLOAT,
        shape: new onnx.TensorShapeProto({
          dim: assigned.map(
            (p) =>
              new onnx.TensorShapeProto.Dimension({
                dimValue: p.constant,
              })
          ),
        }),
      },
    });
  });

  const outputType = TypeChecker.getType(
    flow.return!,
    context.checker
  ).unwrap();
  const assigned = outputType.shape
    .map((s) => Polynomial.from(s))
    .map((p) => Polynomial.assign(p, sizeMap));

  const output = new onnx.TypeProto({
    tensorType: {
      elemType: onnx.TensorProto.DataType.FLOAT,
      shape: new onnx.TensorShapeProto({
        dim: assigned.map(
          (p) =>
            new onnx.TensorShapeProto.Dimension({
              dimValue: p.constant,
            })
        ),
      }),
    },
  });

  return [inputs, output];
}
