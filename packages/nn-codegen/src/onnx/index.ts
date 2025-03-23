import { onnx } from "onnx-proto";

import { SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { declaration, ONNX_NN_DOMAIN, tensorShape } from "./node";

export const DEFAULT_OPSET_IMPORTS = [
  new onnx.OperatorSetIdProto({
    domain: "",
    version: 21,
  }),
  new onnx.OperatorSetIdProto({
    domain: "ai.onnx.ml",
    version: 2,
  })
]

export interface OnnxSettings {
  version: "0.1" | string;
  target: string;

  sizeMap: Record<string, number>;
}

export function codegen(
  source: SourceFile,
  checker: TypeChecker,
  settings: OnnxSettings
): Uint8Array {
  const flow = checker.scope.flows[settings.target];

  if (!flow) {
    throw new Error(`Flow ${settings.target} not found`);
  }

  const context = {
    checker,
    _nextTemporaryIndex: 0,
    temporaryNameRecord: new Map(),
    sizeMap: settings.sizeMap,
  };

  const functions = source.tree.map((t) =>
    declaration(t, context)
  );

  const target = functions.find((f) => f.name === settings.target)!;
  const [inputShapes, outputShape] = tensorShape(flow, context);

  const modelProto = new onnx.ModelProto({
    functions,
    irVersion: onnx.Version.IR_VERSION,
    graph: new onnx.GraphProto({
      name: target.name,
      input: target.input.map(
        (i, index) =>
          new onnx.ValueInfoProto({
            name: i,
            type: inputShapes[index],
          })
      ),
      output: target.output.map(
        (o) =>
          new onnx.ValueInfoProto({
            name: o,
            type: outputShape,
          })
      ),
      node: target.node,
      initializer: [],
    }),
    opsetImport: [
      ...DEFAULT_OPSET_IMPORTS,
      ONNX_NN_DOMAIN
    ],
  });

  return onnx.ModelProto.encode(modelProto).finish();
}
