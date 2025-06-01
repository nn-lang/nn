import { onnx } from "onnx-proto";

import { Polynomial, Size, Type } from "@nn-lang/nn-type-checker";

export namespace TensorShape {
  export function fromType(
    type: Type,
    sizes: Map<Size, Polynomial>,
  ): onnx.TensorShapeProto {
    return new onnx.TensorShapeProto({
      dim: type.shape
        .map(Polynomial.from)
        .map((p) => Polynomial.assign(p, sizes))
        .map((p) => ({ dimValue: p.constant })),
    });
  }
}

export namespace TensorSizes {
  export function fromType(
    type: Type,
    sizes: Map<Size, Polynomial>,
  ): number[] {
    return type.shape
      .map(Polynomial.from)
      .map((p) => Polynomial.assign(p, sizes))
      .map((p) => p.constant)
  }
}
