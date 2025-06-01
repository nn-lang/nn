import { onnx } from "onnx-proto";

import { isCallExpression, travel } from "@nn-lang/nn-language";
import {
  Edge,
  Flow,
  Polynomial,
  Size,
  SizeType,
  TypeChecker,
} from "@nn-lang/nn-type-checker";

import { TensorShape } from "./tensor-shape";

export namespace OnnxNode {
  function solveEdge(
    edge: Edge,
    flowEdges: Edge[],
    parent: string,
    sizes: Map<Size, Polynomial>,
    checker: TypeChecker,
  ): {
    initializers: onnx.ValueInfoProto[];
    nodes: onnx.NodeProto[];
  } {
    const { initializers, nodes } = fromEdge(edge, parent, sizes, checker);
    const toSolve = flowEdges.filter((edge) =>
      edge.args.includes(edge.toSolve),
    );

    toSolve.forEach((edge) => {
      const solved = solveEdge(edge, flowEdges, parent, sizes, checker);
      initializers.push(...solved.initializers);
      nodes.push(...solved.nodes);
    });

    return {
      initializers,
      nodes,
    };
  }

  export function fromEdge(
    edge: Edge,
    parent: string,
    sizes: Map<Size, Polynomial>,
    checker: TypeChecker,
  ): {
    outputs: onnx.ValueInfoProto[];
    initializers: onnx.ValueInfoProto[];
    nodes: onnx.NodeProto[];
  } {
    const flow = edge.callee.flow;

    const outputs = [
      TypeChecker.getType(flow.declaration.node, checker).unwrap(),
    ];

    const trainables = travel(flow.declaration.node, isCallExpression).filter(
      (call) => call.callee.value === "Trainable",
    );

    const flowEdges = travel(flow.declaration.node, isCallExpression)
      .filter((call) => call.callee.value !== "Trainable")
      .map((call, index) =>
        TypeChecker.getEdge(call, checker).expect(
          `Couldn't get edge[${index}] from type checker.`,
        ),
      );

    const head = TypeChecker.getVertex(flow.declaration.node, checker).expect(
      `Couldn't get head node vertex`,
    );
    const headEdge = flowEdges.find((edge) => edge.toSolve === head)!;

    const { initializers, nodes } = solveEdge(
      headEdge,
      flowEdges,
      parent,
      sizes,
      checker,
    );

    return {
      outputs: outputs.map(
        (output, index) =>
          new onnx.ValueInfoProto({
            name: `${parent}_output_${index}`,
            type: {
              tensorType: {
                elemType: onnx.TensorProto.DataType.FLOAT,
                shape: TensorShape.fromType(output, sizes),
              },
            },
          }),
      ),
      initializers: [
        ...trainables
          .map((call) => TypeChecker.getType(call, checker))
          .map((type, index) =>
            type.expect(
              `Couldn't get trainable[${index}] type from type checker.`,
            ),
          )
          .map(
            (type, index) =>
              new onnx.ValueInfoProto({
                name: `${parent}_trainable_${index}`,
                type: {
                  tensorType: {
                    elemType: onnx.TensorProto.DataType.FLOAT,
                    shape: TensorShape.fromType(type, sizes),
                  },
                },
              }),
          ),
        ...initializers,
      ],
      nodes,
    };
  }

  export function fromFlow(
    flow: Flow,
    sizes: Record<string, number>,
    checker: TypeChecker,
  ) {
    const args = flow.args.map((value) =>
      TypeChecker.getVertex(value.first, checker).unwrap(),
    );
    const [sizeArgs, sizeDict] = flow.sizes.reduce(
      ([sizeArgs, sizeDict], size) => {
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

    const sizeMap = flow.sizes.reduce((sizeMap, size) => {
      sizeMap.set(size, sizeDict.get(size)!.polynomial!);
      return sizeMap;
    }, new Map<Size, Polynomial>());

    const edge: Edge = {
      args,
      callee: Edge._getCallee(flow, checker),
      sizeArgs,
      sizeDict,
      toSolve: TypeChecker.getVertex(flow.declaration.node, checker).unwrap(),
      passed: true,
    };

    console.log(flow)
    return fromEdge(edge, "", sizeMap, checker);
  }
}
