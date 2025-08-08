import { onnx } from "onnx-proto";

import {
  isCallExpression,
  isIdentifier,
  isStringLiteralExpression,
  travel,
} from "@nn-lang/nn-language";
import {
  Edge,
  Flow,
  Polynomial,
  Size,
  SizeType,
  TypeChecker,
} from "@nn-lang/nn-type-checker";

import { flowAttribute } from "./attribute";
import { TensorShape, TensorSizes } from "./tensor-shape";

export namespace OnnxNode {
  const _nodeMap = new Map<string, onnx.NodeProto>();

  function makeNode(
    flow: Flow,
    parent: string,
    inputs: string[],
    sizes: Map<Size, Polynomial>,
  ): onnx.NodeProto {
    if (_nodeMap.has(parent)) return _nodeMap.get(parent)!;

    const record = [...sizes.entries()].reduce(
      (record, [size, polynomial]) => {
        record[size.ident] = polynomial.constant;
        return record;
      },
      {} as Record<string, number>,
    );

    const result = new onnx.NodeProto({
      input: inputs,
      output: [`${parent}_output_0`],
      opType: flow.declaration.declaration,
      name: `${parent}`,
      attribute: flowAttribute(flow.declaration.declaration, record),
    });

    _nodeMap.set(parent, result);
    return result;
  }

  function solveEdge(
    parentFlow: Flow,
    edge: Edge,
    flowEdges: Edge[],
    parent: string,
    inputs: string[],
    sizes: Map<Size, Polynomial>,
    checker: TypeChecker,
  ): {
    initializers: onnx.TensorProto[];
    nodes: onnx.NodeProto[];
    outputs: onnx.ValueInfoProto[];
  } {
    const initializers: onnx.TensorProto[] = [];
    const nodes: onnx.NodeProto[] = [];
    const edgeInputs: string[] = [];

    edge.args.forEach((arg) => {
      const fromOtherEdge = flowEdges.find(
        (flowEdge) => flowEdge.toSolve === arg,
      );

      if (fromOtherEdge) {
        const solved = solveEdge(
          parentFlow,
          fromOtherEdge,
          flowEdges,
          parent,
          inputs,
          sizes,
          checker,
        );

        edgeInputs.push(...solved.outputs.map(({ name }) => name));
        initializers.push(...solved.initializers);
        nodes.push(...solved.nodes);
      } else if (isIdentifier(arg.expression)) {
        const argIdx = parentFlow.declaration.node.argumentList.args.findIndex(
          ({ ident }) => ident === arg.expression,
        );

        edgeInputs.push(inputs[argIdx]!);
      } else if (
        isCallExpression(arg.expression) &&
        arg.expression.callee.value === "Trainable"
      ) {
        if (isStringLiteralExpression(arg.expression.args[0]!)) {
          initializers.push(
            new onnx.TensorProto({
              name: `${parent}_trainable_${arg.expression.args[0].value}`,
              dataType: onnx.TensorProto.DataType.FLOAT,
              dims: TensorSizes.fromType(arg.type.unwrap(), sizes),
            }),
          );

          edgeInputs.push(
            `${parent}_trainable_${arg.expression.args[0].value}`,
          );
        }
      }
    });

    const callIdx = travel(
      parentFlow.declaration.node,
      isCallExpression,
    ).findIndex((expr) => expr === edge.toSolve.expression);

    const edgeSizeDict = [...edge.sizeDict.entries()].reduce(
      (dict, [key, value]) => {
        dict.set(key, Polynomial.assign(Polynomial.from(value), sizes));

        return dict;
      },
      new Map<Size, Polynomial>(),
    );

    const solvedEdge = fromEdge(
      edge,
      `${parent}/${edge.callee.flow.declaration.declaration}_${callIdx}`,
      edgeInputs,
      edgeSizeDict,
      checker,
      sizes,
    );

    initializers.push(...solvedEdge.initializers);
    nodes.push(...solvedEdge.nodes);

    return {
      initializers,
      nodes,
      outputs: solvedEdge.outputs,
    };
  }

  export function fromEdge(
    edge: Edge,
    parent: string,
    inputs: string[],
    sizes: Map<Size, Polynomial>,
    checker: TypeChecker,
    outerSizes?: Map<Size, Polynomial>,
  ): {
    outputs: onnx.ValueInfoProto[];
    initializers: onnx.TensorProto[];
    nodes: onnx.NodeProto[];
  } {
    const flow = edge.callee.flow;

    const flowEdges = travel(flow.declaration.node, isCallExpression)
      .filter((call) => call.callee.value !== "Trainable")
      .map((call, index) =>
        TypeChecker.getEdge(call, checker).expect(
          `Couldn't get edge[${index}] from type checker.`,
        ),
      );

    const head = edge.callee.return;
    const headEdge = flowEdges.find((edge) => edge.toSolve === head);

    if (!headEdge) {
      // Declaration only
      return {
        outputs: [
          new onnx.ValueInfoProto({
            name: `${parent}_output_0`,
            type: {
              tensorType: {
                elemType: onnx.TensorProto.DataType.FLOAT,
                shape: TensorShape.fromType(
                  edge.toSolve.type.expect("Output type was Err"),
                  outerSizes ?? sizes,
                ),
              },
            },
          }),
        ],
        initializers: [],
        nodes: [makeNode(flow, parent, inputs, sizes)],
      };
    }

    return solveEdge(flow, headEdge, flowEdges, parent, inputs, sizes, checker);
  }

  export function fromFlow(
    flow: Flow,
    sizes: Record<string, number>,
    checker: TypeChecker,
  ) {
    const callee = Edge._getCallee(flow, checker);
    const args = flow.args.map((value, index) =>
      TypeChecker.getVertex(value.first, checker).expect(
        `Flow args[${index}] was err`,
      ),
    );

    const [sizeArgs, sizeDict] = Object.values(flow.declaration.sizes).reduce(
      ([sizeArgs, sizeDict], size) => {
        if (!(size.ident in sizes)) {
          throw new Error(
            `Size ${size.ident} needed for flow ${callee.flow.declaration.declaration}`,
          );
        }

        const sizeType: SizeType = {
          computeKind: "number",
          left: sizes[size.ident]!,
          polynomial: Polynomial.constant(sizes[size.ident]!),
        };

        sizeArgs.push(sizeType);
        sizeDict.set(size, sizeType);

        return [sizeArgs, sizeDict];
      },
      [[] as SizeType[], new Map<Size, SizeType>()],
    );

    const sizeMap = Object.values(flow.declaration.sizes).reduce(
      (sizeMap, size) => {
        sizeMap.set(size, sizeDict.get(size)!.polynomial!);
        return sizeMap;
      },
      new Map<Size, Polynomial>(),
    );

    const edge: Edge = {
      args,
      callee,
      sizeArgs,
      sizeDict,
      toSolve: callee.return,
      passed: true,
    };

    return fromEdge(
      edge,
      flow.declaration.declaration,
      flow.args.map((arg) => arg.ident),
      sizeMap,
      checker,
    );
  }
}
