import type { SyntaxNode } from "tree-sitter";

import { emptyPosition, SourceFile, toPosition } from ".";
import { Position } from "./types";

export interface Node {
  position: Position;

  type: string;
  id: number;
}

export interface NodeContext {
  nodes: Map<number, Node>;
  nextId: number;
}

export function createNode<T extends Node>(
  type: T["type"],
  props: Omit<T, "type" | "id" | "position">,
  node: SyntaxNode | null,
  file: SourceFile
): T {
  const result = {
    type,
    id: file._context.node.nextId++,
    position: node ? toPosition(node) : emptyPosition,
    ...props,
  } as T;

  file._context.node.nodes.set(result.id, result);
  return result;
}
