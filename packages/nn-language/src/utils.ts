import type * as TreeSitter from "tree-sitter";

import { SizeNode, TypeNode } from "./ast";
import { Node } from "./node";
import { Position } from "./types";

export const emptyPosition: Position = { pos: 0, end: 0 };

export function toPosition(
  node: TreeSitter.SyntaxNode | TreeSitter.SyntaxNode[],
): Position {
  if (Array.isArray(node)) {
    if (node.length == 0) throw new Error("node was empty array");

    return {
      pos: node.at(0)!.startIndex,
      end: node.at(-1)!.endIndex,
    };
  }

  return {
    pos: node.startIndex,
    end: node.endIndex,
  };
}

type IsCallback<T extends Node> = (node: Node) => node is T;
type BooleanCallback = (node: Node) => boolean;
type TravelCallback<T> = T extends Node
  ? IsCallback<T>
  : (node: Node) => T | undefined;

export function travel<T>(
  node: Node | Node[],
  callback: TravelCallback<T> | BooleanCallback,
): T[] {
  const result: T[] = [];

  const _travel = (node: Node | Node[] | Node[keyof Node]) => {
    if (
      !node ||
      typeof node === "string" ||
      typeof node === "boolean" ||
      typeof node === "number"
    )
      return;
    if ("pos" in node || "path" in node) return;

    if (Array.isArray(node)) {
      node.forEach(_travel);
      return;
    }

    const res = callback(node);
    if (typeof res === "boolean") {
      res && result.push(node as T);
    } else if (res !== undefined) {
      result.push(res);
    }

    Object.values(node).forEach(_travel);
  };

  _travel(node);
  return result;
}

export function nodeOnPosition<T extends Node = Node>(
  node: Node | Node[],
  position: number,
  filter?: TravelCallback<T> | BooleanCallback,
): T | undefined {
  const filtered = filter ? travel(node, filter) : (node as T[]);

  const sorted = filtered
    .filter((node) => {
      const { pos, end } = node.position;
      return position >= pos && position <= end;
    })
    .sort((a, b) => {
      const lenA = a.position.end - a.position.pos;
      const lenB = b.position.end - b.position.pos;
      return lenA - lenB;
    });

  return sorted.at(0);
}

export function getTypeNodeString(node: TypeNode): string {
  return node.sizes
    ? `Tensor[${node.sizes.map(getSizeNodeString).join(", ")}]`
    : `Tensor`;
}

export function getSizeNodeString(node: SizeNode): string {
  const sizeTypeOperator = {
    pow: "^",
    mul: "*",
    div: "/",
    add: "+",
    sub: "-",
  };

  switch (node.type) {
    case "ArithmeticSizeNode":
      return `(${getSizeNodeString(node.left)} ${
        sizeTypeOperator[node.sizeType]
      } ${getSizeNodeString(node.right)})`;
    case "IdentifierSizeNode":
      return node.ident.value;
    case "NumberSizeNode":
      return node.number.toString();
  }
}
