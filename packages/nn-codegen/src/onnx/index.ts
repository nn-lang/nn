import { onnx } from "onnx-proto";
import { Result, err, ok } from "ts-features";

import { Workspace } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { DEFAULT_OPSET_IMPORTS, ONNX_NN_DOMAIN } from "./node";
import { OnnxNode } from "./flow";

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

    const { outputs, initializers, nodes } = OnnxNode.fromFlow(flow, settings.sizeMap, checker);

    const initializerMap = initializers.reduce((map, initializer) => {
      map.set(initializer.name, initializer);
      return map;
    }, new Map<string, onnx.ValueInfoProto>());

    const nodeMap = nodes.reduce((map, node) => {
      map.set(node.name, node);
      return map;
    }, new Map<string, onnx.NodeProto>());

    const modelProto = new onnx.ModelProto({
      irVersion: onnx.Version.IR_VERSION,
      graph: new onnx.GraphProto({
        name: flow.declaration.declaration,
        input: [],
        output: outputs,
        node: [...nodeMap.values()],
        initializer: [...initializerMap.values()],
      }),
      opsetImport: [...DEFAULT_OPSET_IMPORTS, ONNX_NN_DOMAIN],
    });

    return ok(onnx.ModelProto.encode(modelProto).finish());
  }
}
