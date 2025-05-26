import { onnx } from "onnx-proto";
import { Result, err, ok } from "ts-features";

import { Workspace } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { DEFAULT_OPSET_IMPORTS, ONNX_NN_DOMAIN, tensorShape } from "./node";

export namespace Onnx {
  export interface OnnxSettings {
    version: "0.1" | string;

    target: {
      source: string;
      declaration: string;
    };

    sizeMap: Record<string, number>;
  }

  export function codegen(
    workspace: Workspace,
    checker: TypeChecker,
    settings: OnnxSettings,
  ): Result<Uint8Array, string> {
    const file = checker.scope.files[settings.target.source];

    if (!file) {
      return err(`File ${settings.target.source} is not in workspace`);
    }

    const flow = file.flows[settings.target.declaration];

    if (!flow) {
      return err(`Flow ${settings.target} not found`);
    }

    const context = {
      workspace,
      checker,
      _nextTemporaryIndex: 0,
      temporaryNameRecord: new Map(),
      sizeMap: settings.sizeMap,
    };

    const functions: onnx.FunctionProto[] = []; // !TODO

    const target = functions.find((f) => f.name === settings.target.source)!;
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
            }),
        ),
        output: target.output.map(
          (o) =>
            new onnx.ValueInfoProto({
              name: o,
              type: outputShape,
            }),
        ),
        node: target.node,
        initializer: [],
      }),
      opsetImport: [...DEFAULT_OPSET_IMPORTS, ONNX_NN_DOMAIN],
    });

    return ok(onnx.ModelProto.encode(modelProto).finish());
  }
}
