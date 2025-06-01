import { onnx } from "onnx-proto";

const AttributeType = onnx.AttributeProto.AttributeType;

export function flowAttribute(
  operator: string,
  sizes: Record<string, number>,
): onnx.AttributeProto[] {
  if (operator === "BatchNormalization") {
    return [
      makeAttr("epsilon", AttributeType.FLOAT, 1e-5),
      makeAttr("momentum", AttributeType.FLOAT, 0.9),
      makeAttr("training_model", AttributeType.INT, 0),
    ];
  }

  if (operator === "Concat") {
    return [makeAttr("axis", AttributeType.INT, 0)];
  }

  if (operator === "Conv") {
    return [
      makeAttr("group", AttributeType.INT, sizes["Group"]!),
      makeAttr("kernel_shape", AttributeType.INTS, [sizes["kH"]!, sizes["kW"]!]),
      makeAttr("pads", AttributeType.INTS, [sizes["Pads"]!, sizes["Pads"]!]),
      makeAttr("strides", AttributeType.INTS, [sizes["Strides"]!, sizes["Strides"]!]),
    ];
  }

  if (operator === "ConvTranspose") {
    return [
      makeAttr("group", AttributeType.INT, sizes["Group"]!),
      makeAttr("kernel_shape", AttributeType.INTS, [sizes["kH"]!, sizes["kW"]!]),
      makeAttr("pads", AttributeType.INTS, [sizes["Pads"]!, sizes["Pads"]!]),
      makeAttr("pads", AttributeType.INTS, [sizes["Pads"]!, sizes["Pads"]!]),
      makeAttr("strides", AttributeType.INTS, [sizes["Strides"]!, sizes["Strides"]!]),
    ];
  }

  return [];
}

function makeAttr<T extends onnx.AttributeProto.AttributeType>(
  name: string,
  type: T,
  value: MakeAttrValueType<T>,
) {
  return new onnx.AttributeProto({
    name,
    type,
    [Helper[type] as string]: value,
  });
}

type MakeAttrValueType<T extends onnx.AttributeProto.AttributeType> =
  (typeof Helper)[T] extends keyof onnx.AttributeProto
    ? onnx.AttributeProto[(typeof Helper)[T]]
    : never;

const Helper = {
  [onnx.AttributeProto.AttributeType.UNDEFINED]: undefined,
  [onnx.AttributeProto.AttributeType.FLOAT]: "f",
  [onnx.AttributeProto.AttributeType.INT]: "i",
  [onnx.AttributeProto.AttributeType.STRING]: "s",
  [onnx.AttributeProto.AttributeType.TENSOR]: "t",
  [onnx.AttributeProto.AttributeType.GRAPH]: "g",
  [onnx.AttributeProto.AttributeType.SPARSE_TENSOR]: "sparseTensor",
  [onnx.AttributeProto.AttributeType.TYPE_PROTO]: "tp",
  [onnx.AttributeProto.AttributeType.FLOATS]: "floats",
  [onnx.AttributeProto.AttributeType.INTS]: "ints",
  [onnx.AttributeProto.AttributeType.STRINGS]: "strings",
  [onnx.AttributeProto.AttributeType.TENSORS]: "tensors",
  [onnx.AttributeProto.AttributeType.GRAPHS]: "graphs",
  [onnx.AttributeProto.AttributeType.SPARSE_TENSORS]: "sparseTensors",
  [onnx.AttributeProto.AttributeType.TYPE_PROTOS]: "typeProtos",
} satisfies Record<
  onnx.AttributeProto.AttributeType,
  keyof onnx.AttributeProto | undefined
>;
