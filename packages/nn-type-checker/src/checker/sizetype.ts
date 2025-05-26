import { DeclarationScope, Size } from "../resolver";

import { SizeNode } from "@nn-lang/nn-language";

import { Polynomial } from "./polynomial";

export type SizeType = SizeTypeIdent | SizeTypeNumber | SizeTypeBinary;

interface SizeTypeIdent {
  left: Size;

  node?: SizeNode;
  polynomial?: Polynomial;
  computeKind: "ident";
}

interface SizeTypeNumber {
  left: number;

  node?: SizeNode;
  polynomial?: Polynomial;
  computeKind: "number";
}

interface SizeTypeBinary {
  left: SizeType;
  right: SizeType;

  node?: SizeNode;
  polynomial?: Polynomial;
  computeKind: "pow" | "mul" | "div" | "add" | "sub";
}

export namespace SizeType {
  export function from(node: SizeNode, scope: DeclarationScope): SizeType {
    switch (node.sizeType) {
      case "pow":
      case "mul":
      case "div":
      case "add":
      case "sub":
        return {
          left: from(node.left, scope),
          right: from(node.right, scope),

          node,
          computeKind: node.sizeType,
        };
      case "ident":
        return {
          left: Size.find(scope, node.ident!).unwrap(),

          node,
          computeKind: "ident",
        };
      case "number":
        return {
          left: node.number!,

          node,
          computeKind: "number",
        };
    }
  }

  export function isSame(left: SizeType, right: SizeType): boolean {
    if (left.computeKind !== right.computeKind) {
      return false;
    }

    if (
      (left.computeKind === "mul" && right.computeKind === "mul") ||
      (left.computeKind === "add" && right.computeKind === "add")
    ) {
      return (
        (isSame(left.left, right.left) && isSame(left.right, right.right)) ??
        (isSame(left.left, right.right) && isSame(left.right, right.left))
      );
    } else if (
      (left.computeKind === "pow" && right.computeKind === "pow") ||
      (left.computeKind === "div" && right.computeKind === "div") ||
      (left.computeKind === "sub" && right.computeKind === "sub")
    ) {
      return isSame(left.left, right.left) && isSame(left.right, right.right);
    } else if (
      (left.computeKind === "ident" && right.computeKind === "ident") ||
      (left.computeKind === "number" && right.computeKind === "number")
    ) {
      return left.left === right.left;
    }

    throw new Error("Unreachable Code");
  }

  export function isSameStructure(
    left: SizeType,
    right: SizeType,
  ): [SizeType, Size] | boolean {
    if (
      left.computeKind !== right.computeKind &&
      right.computeKind !== "ident"
    ) {
      return false;
    }

    if (
      (left.computeKind === "mul" && right.computeKind === "mul") ||
      (left.computeKind === "add" && right.computeKind === "add")
    ) {
      return (
        (isSameStructure(left.left as SizeType, right.left as SizeType) &&
          isSameStructure(left.right as SizeType, right.right as SizeType)) ??
        (isSameStructure(left.left as SizeType, right.right as SizeType) &&
          isSameStructure(left.right as SizeType, right.left as SizeType))
      );
    } else if (
      (left.computeKind === "pow" && right.computeKind === "pow") ||
      (left.computeKind === "div" && right.computeKind === "div") ||
      (left.computeKind === "sub" && right.computeKind === "sub")
    ) {
      return (
        isSameStructure(left.left as SizeType, right.left as SizeType) &&
        isSameStructure(left.right as SizeType, right.right as SizeType)
      );
    } else if (right.computeKind === "ident") {
      return [left, right.left] as [SizeType, Size];
    } else if (
      left.computeKind === "number" &&
      right.computeKind === "number"
    ) {
      return left.left === right.left;
    }

    throw new Error(`Unreachable Code`);
  }

  export function isAssignable(
    from: SizeType,
    to: SizeType,
  ): [SizeType, Size] | boolean {
    switch (to.computeKind) {
      case "pow":
      case "mul":
      case "div":
      case "add":
      case "sub":
        return true; // compute later
      case "ident":
        return [from, to.left];
      case "number":
        return (
          Polynomial.isConstant(polynomial(from)) &&
          polynomial(from).constant === to.left
        );
    }
  }

  export function findAssignable(
    from: SizeType,
    to: SizeType,
  ): [SizeType, SizeType] | false {
    switch (to.computeKind) {
      case "pow":
      case "mul":
      case "div":
      case "add":
      case "sub":
        return [from, to];
      case "ident":
        return false;
      case "number":
        return false;
    }
  }

  export function convert(size: SizeType, dict: Map<Size, SizeType>): SizeType {
    switch (size.computeKind) {
      case "pow":
      case "mul":
      case "div":
      case "add":
      case "sub":
        return {
          left: convert(size.left as SizeType, dict),
          right: convert(size.right as SizeType, dict),

          computeKind: size.computeKind,
        };
      case "ident":
        return dict.get(size.left as Size)!;
      case "number":
        return {
          left: size.left,
          computeKind: "number",
        };
    }
  }

  export function toString(size: SizeType): string {
    return Polynomial.inspect(Polynomial.from(size));
  }

  export function polynomial(size: SizeType): Polynomial {
    if (size.polynomial) {
      return size.polynomial;
    }

    return (size.polynomial = Polynomial.from(size));
  }
}
