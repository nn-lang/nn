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
type TraversableRecord = Record<string, unknown>;

function isTraversableRecord(value: unknown): value is TraversableRecord {
  return typeof value === "object" && value !== null;
}

function isPositionRecord(value: TraversableRecord): boolean {
  return typeof value["pos"] === "number" && typeof value["end"] === "number";
}

function isSourceFileRecord(value: TraversableRecord): boolean {
  return (
    typeof value["path"] === "string" &&
    typeof value["content"] === "string" &&
    Array.isArray(value["declarations"]) &&
    Array.isArray(value["dependencies"]) &&
    Array.isArray(value["diagnostics"])
  );
}

function isNodeRecord(
  value: TraversableRecord,
): value is TraversableRecord & Node {
  return (
    typeof value["type"] === "string" &&
    typeof value["id"] === "number" &&
    isTraversableRecord(value["position"]) &&
    isPositionRecord(value["position"]) &&
    isTraversableRecord(value["source"]) &&
    isSourceFileRecord(value["source"])
  );
}

export function travel<T>(
  node: Node | Node[],
  callback: TravelCallback<T> | BooleanCallback,
): T[] {
  const result: T[] = [];

  const _travel = (value: unknown) => {
    if (!isTraversableRecord(value)) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(_travel);
      return;
    }

    if (isPositionRecord(value) || isSourceFileRecord(value)) {
      return;
    }

    if (isNodeRecord(value)) {
      const res = callback(value);
      if (typeof res === "boolean") {
        res && result.push(value as T);
      } else if (res !== undefined) {
        result.push(res);
      }
    }

    Object.values(value).forEach(_travel);
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
