import { DeclarationScope, Size } from "../resolver";
import { None, Option, Some } from "ts-features";

import { CallExpression, TypeNode } from "@nn-lang/nn-language";

import { Polynomial } from "./polynomial";
import { SizeType } from "./sizetype";

export interface Type {
  type: "Tensor";
  shape: SizeType[];
}

export namespace Type {
  export function from(
    node: TypeNode | CallExpression,
    scope: DeclarationScope,
  ): Type {
    return {
      type: "Tensor",
      shape: node.sizes
        ? node.sizes.map((size) => SizeType.from(size, scope))
        : [],
    };
  }

  export function isSame(left: Type, right: Type): boolean {
    if (left.shape.length !== right.shape.length) {
      return false;
    }

    for (let i = 0; i < left.shape.length; i++) {
      const leftSize = left.shape.at(i)!;
      const rightSize = right.shape.at(i)!;

      if (
        !SizeType.isSame(leftSize, rightSize) &&
        !Polynomial.isSame(
          Polynomial.from(leftSize),
          Polynomial.from(rightSize),
        )
      ) {
        return false;
      }
    }

    return true;
  }

  export function isAssignable(
    from: Type,
    to: Type,
  ): Option<[SizeType[], [SizeType[], Size[]]]> {
    const result_: [SizeType[], Size[]] = [[], []];

    if (from.shape.length < to.shape.length) {
      return None();
    }

    const diff = from.shape.length - to.shape.length;
    const from_ = from.shape.slice(0, diff);

    for (let i = -1; i >= -to.shape.length; i--) {
      const leftSize = from.shape.at(i)!;
      const rightSize = to.shape.at(i)!;

      const result = SizeType.isAssignable(leftSize, rightSize);

      if (!result) {
        return None();
      }

      if (result !== true) {
        const [left, right] = result;
        result_[0].push(left);
        result_[1].push(right);
      }
    }

    return Some([from_, result_]);
  }

  export function isAssignableExact(
    from: Type,
    to: Type,
  ): Option<[SizeType[], Size[]]> {
    const result_: [SizeType[], Size[]] = [[], []];

    if (from.shape.length !== to.shape.length) {
      return None();
    }

    for (let i = 0; i < from.shape.length; i++) {
      const leftSize = from.shape.at(i)!;
      const rightSize = to.shape.at(i)!;

      const result = SizeType.isAssignable(leftSize, rightSize);

      if (!result) {
        return None();
      }

      if (result !== true) {
        const [left, right] = result;
        result_[0].push(left);
        result_[1].push(right);
      }
    }

    return Some(result_);
  }

  export function findAssignable(
    from: Type,
    to: Type,
  ): Option<[SizeType[], SizeType[]]> {
    const result_: [SizeType[], SizeType[]] = [[], []];

    if (from.shape.length < to.shape.length) {
      return None();
    }

    for (let i = -1; i >= -to.shape.length; i--) {
      const leftSize = from.shape.at(i)!;
      const rightSize = to.shape.at(i)!;

      const result = SizeType.findAssignable(leftSize, rightSize);

      if (result) {
        const [left, right] = result;
        result_[0].push(left);
        result_[1].push(right);
      }
    }

    return Some(result_);
  }

  export function findAssignableExact(
    from: Type,
    to: Type,
  ): Option<[SizeType[], SizeType[]]> {
    const result_: [SizeType[], SizeType[]] = [[], []];

    if (from.shape.length !== to.shape.length) {
      return None();
    }

    for (let i = 0; i < from.shape.length; i++) {
      const leftSize = from.shape.at(i)!;
      const rightSize = to.shape.at(i)!;

      const result = SizeType.findAssignable(leftSize, rightSize);

      if (result) {
        const [left, right] = result;
        result_[0].push(left);
        result_[1].push(right);
      }
    }

    return Some(result_);
  }

  export function convert(type: Type, dict: Map<Size, SizeType>): Type {
    return {
      type: "Tensor",
      shape: type.shape.map((size) => SizeType.convert(size, dict)),
    };
  }

  export function concatShape(type: Type, shape: SizeType[]): Type {
    return {
      type: "Tensor",
      shape: shape.concat(type.shape),
    };
  }

  export function toString(type: Type): string {
    return `Tensor[${type.shape.map(SizeType.toString).join(", ")}]`;
  }
}
