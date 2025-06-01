import { SizeType, Type, TypeChecker, Vertex } from "..";
import { DeclarationScope, Flow, Size } from "../resolver";
import { None, Option, Some } from "ts-features";

import {
  CallExpression,
  isAssignmentExpression,
  isCallExpression,
  isStringLiteralExpression,
  isTupleExpression,
  travel,
} from "@nn-lang/nn-language";

import { Polynomial } from "./polynomial";

export interface Edge {
  args: Vertex[];
  sizeArgs: SizeType[];

  callee: Callee;
  toSolve: Vertex;

  sizeDict: Map<Size, SizeType>
  passed?: boolean;
}

export interface Callee {
  sizes: Size[];
  args: Vertex[];
  return: Vertex;
  flow: Flow;
}

export namespace Edge {
  export function _getCallee(flow: Flow, context: TypeChecker): Callee {
    if (context._internal.calleeMap.has(flow)) {
      return context._internal.calleeMap.get(flow)!;
    }

    const callee = {
      sizes: [...flow.sizes],
      args: flow.args.map((arg) => context.vertices.get(arg.first)!),
      return: flow.returnType
        ? Vertex.from(
            flow.declaration.node,
            Some(Type.from(flow.returnType, flow.declaration)),
          )
        : context.vertices.get(flow.return!)!,
      flow,
    };

    context._internal.calleeMap.set(flow, callee);
    return callee;
  }

  export function make(
    scope: DeclarationScope,
    call: CallExpression,
    callee: Flow,
    context: TypeChecker,
    buffer?: Vertex[],
  ): Edge {
    const args = call.args.filter((arg) => !isStringLiteralExpression(arg));

    return {
      args: buffer
        ? [...buffer, ...args.map((arg) => context.vertices.get(arg)!)]
        : args.map((arg) => context.vertices.get(arg)!),

      sizeArgs: (call.sizes ?? []).map((size) => SizeType.from(size, scope)),
      callee: _getCallee(callee, context),

      sizeDict: new Map(),
      toSolve: context.vertices.get(call)!,
    };
  }

  export function getAll(
    scope: DeclarationScope,
    edges: Edge[],
    context: TypeChecker,
  ): void {
    const { node: declaration } = scope;
    const visited = new Set<CallExpression>();

    let buffer: Vertex[] = declaration.firstPipe
      ? declaration.argumentList.args.map(
          (arg) => context.vertices.get(arg.ident)!,
        )
      : [];

    declaration.exprs.forEach((expr, index) => {
      const firstExpression = isTupleExpression(expr)
        ? expr.elements[0]
        : isAssignmentExpression(expr)
          ? expr.right
          : expr;

      if (!firstExpression) throw new Error("Unreachable code");

      const callNeeded = index !== 0 || (index === 0 && declaration.firstPipe);

      if (!isCallExpression(firstExpression) && callNeeded) {
        context.diagnostics.push({
          source: scope.file.file,
          message:
            "First expression must be a function call if there is a pipe",
          position: firstExpression.position,
        });

        return;
      }

      if (callNeeded) {
        const call = firstExpression as CallExpression;
        const callee = call.callee.value;

        if (!(callee in scope.file.flows)) {
          return;
        }

        const calleeFlow = scope.file.flows[callee];
        if (!calleeFlow) throw new Error("Already checked flow is undefined");

        const edge = make(scope, call, calleeFlow, context, buffer);

        edges.push(edge);
        visited.add(call);
      }

      buffer = isTupleExpression(expr)
        ? expr.elements.map((ident) => context.vertices.get(ident)!)
        : [context.vertices.get(expr)!];
    });

    travel(declaration.exprs, isCallExpression)
      .filter(
        (call) =>
          !visited.has(call) && TypeChecker.getType(call, context).isErr(),
      )
      .forEach((call) => {
        const callee = call.callee.value;
        if (!(callee in scope.file.flows)) {
          return;
        }

        const calleeFlow = scope.file.flows[callee]!;

        const edge = make(scope, call, calleeFlow, context);
        edges.push(edge);
      });
  }

  function convertType(
    edge: Edge,
    left: SizeType[],
    right: Size[],
    sizeDict: Map<Size, SizeType>,
    context: TypeChecker,
  ): Option<Type> {
    const indicesMap = right.reduce((prev, size, index) => {
      if (!prev.has(size)) {
        prev.set(size, []);
      }

      prev.get(size)!.push(index);
      return prev;
    }, new Map<Size, number[]>());

    let failed = false;
    indicesMap.forEach((indices) => {
      const [first, ...rest] = indices;

      for (const index of rest) {
        if (
          !SizeType.isSame(left[first!]!, left[index]!) &&
          !Polynomial.isSame(
            SizeType.polynomial(left[first!]!),
            SizeType.polynomial(left[index]!),
          )
        ) {
          context.diagnostics.push({
            source: edge.toSolve.expression.source,
            message: `Cannot assign ${SizeType.toString(left[first!]!)} to ${SizeType.toString(left[index!]!)}`,
            position: edge.toSolve.expression.position,
          });

          failed = true;
        }
      }

      sizeDict.set(right[first!]!, left[first!]!);
    });

    if (failed) {
      return None();
    }

    return Some(Type.convert(edge.callee.return.type.unwrap(), sizeDict));
  }

  function validate(
    edge: Edge,
    sizeDict: Map<Size, SizeType>,
    context: TypeChecker,
  ): void {
    const origin = edge.callee.flow.declaration.sizes;
    Object.values(origin).forEach((size) => {
      if (!sizeDict.has(size)) {
        context.diagnostics.push({
          source: edge.toSolve.expression.source,
          message: `Size ${size.ident} is ambiguous.`,
          position: edge.toSolve.expression.position,
        });

        edge.passed = false; // unrecoverable
      }
    });

    if (edge.passed === false) return;

    const polynomialDict = new Map<Size, Polynomial>();
    sizeDict.forEach((size, key) => {
      polynomialDict.set(key, SizeType.polynomial(size));
    });

    const leftArgs = edge.args.map((arg) => arg.type.unwrap());
    const rightArgs = edge.callee.args.map((arg) => arg.type.unwrap());

    const [left, right] = leftArgs.reduce<[SizeType[], SizeType[]]>(
      ([left, right], _, index) => {
        if (index === 0) {
          const [from, to] = Type.findAssignable(
            leftArgs[index!]!,
            rightArgs[index!]!,
          ).unwrap();
          left.push(...from), right.push(...to);
        } else {
          const [from, to] = Type.findAssignableExact(
            leftArgs[index!]!,
            rightArgs[index!]!,
          ).unwrap();
          left.push(...from), right.push(...to);
        }

        return [left, right];
      },
      [[], []],
    );

    left.forEach((_, index) => {
      const leftPolynomial = SizeType.polynomial(left[index!]!);
      const rightPolynomial = Polynomial.assign(
        SizeType.polynomial(right[index!]!),
        polynomialDict,
      );

      if (!Polynomial.isSame(leftPolynomial, rightPolynomial)) {
        context.diagnostics.push({
          source: edge.toSolve.expression.source,
          message: `Size mismatch. expected: ${Polynomial.inspect(rightPolynomial)}, actual: ${Polynomial.inspect(leftPolynomial)}.`,
          position: left[index]?.node?.position || edge.toSolve.expression.position,
        });

        edge.passed = false; // unrecoverable
      }
    });
  }

  export function solve(edge: Edge, context: TypeChecker): void {
    if (typeof edge.passed === "boolean") return;

    if (edge.callee.args.length !== edge.args.length) {
      context.diagnostics.push({
        source: edge.toSolve.expression.source,
        message: `Expected ${edge.callee.args.length} arguments, but got ${edge.args.length}.`,
        position: edge.toSolve.expression.position,
      });

      edge.passed = false; // unrecoverable
      return;
    }

    if (
      [...edge.args, ...edge.callee.args, edge.callee.return].some((vertex) =>
        vertex.type.isNone(),
      )
    ) {
      return;
    }

    const [left, right] = (() => {
      if (edge.sizeArgs.length && edge.callee.sizes.length) {
        if (edge.sizeArgs.length !== edge.callee.sizes.length) {
          context.diagnostics.push({
            source: edge.toSolve.expression.source,
            message: `Expected ${edge.callee.sizes.length} sizes, but got ${edge.sizeArgs.length}.`,
            position: edge.toSolve.expression.position,
          });

          edge.passed = false; // unrecoverable
          return [[], []];
        }

        return [[...edge.sizeArgs], [...edge.callee.sizes]];
      }

      return [[], []];
    })();

    if (edge.passed === false) return;

    let from: SizeType[] | undefined;

    if (edge.args.length && edge.callee.args.length) {
      const [firstLeftArg, ...restLeftArgs] = edge.args;
      const [firstRightArg, ...restRightArgs] = edge.callee.args;

      from = Type.isAssignable(
        firstLeftArg!.type.unwrap(),
        firstRightArg!.type.unwrap(),
      ).mapOrElse(
        () => {
          context.diagnostics.push({
            source: edge.toSolve.expression.source,
            message: `Cannot assign ${Type.toString(
              firstLeftArg!.type.unwrap(),
            )} to ${Type.toString(firstRightArg!.type.unwrap())}.`,
            position: firstLeftArg!.expression.position,
          });

          edge.passed = false; // unrecoverable
          return [];
        },
        ([from, [_left, _right]]) => {
          left.push(..._left);
          right.push(..._right);

          return from;
        },
      );

      Array.from<number>({ length: restLeftArgs.length }).reduce<
        [SizeType[], Size[]]
      >(
        ([left, right], _, i) => {
          const leftArg = restLeftArgs[i]!;
          const rightArg = restRightArgs[i]!;

          return Type.isAssignableExact(
            leftArg.type.unwrap(),
            rightArg.type.unwrap(),
          ).mapOrElse(
            () => {
              context.diagnostics.push({
                source: edge.toSolve.expression.source,
                message: `Cannot assign ${Type.toString(
                  leftArg.type.unwrap(),
                )} to ${Type.toString(rightArg.type.unwrap())}.`,
                position: leftArg.expression.position,
              });

              edge.passed = false; // unrecoverable
              return [left, right];
            },
            ([_left, _right]) => {
              left.push(..._left);
              right.push(..._right);

              return [left, right];
            },
          );
        },
        [left, right],
      );
    }

    if (edge.passed === false) return;

    const sizeDict = new Map<Size, SizeType>();
    left.forEach((size, index) => {
      const calleeSize = right[index]!;
      sizeDict.set(calleeSize, size);
    });

    validate(edge, sizeDict, context);

    if (edge.passed === false) return;

    if (left.length === 0) {
      edge.sizeDict = sizeDict;
      edge.passed = true;
      return;
    }

    const result = convertType(edge, left, right, sizeDict, context);
    if (result.isSome()) {
      const type = result.unwrap();
      edge.toSolve.type = from
        ? Some(Type.concatShape(type, from))
        : Some(type);

      edge.sizeDict = sizeDict;
      edge.passed = true;
    } else {
      edge.passed = false; // unrecoverable
    }
  }
}
