import type { SyntaxNode } from "tree-sitter";

import { emptyPosition, SourceFile, toPosition } from ".";
import { Position } from "./types";
import { Workspace } from "./workspace";

export interface Node {
  source: SourceFile;
  position: Position;

  type: string;
  id: number;
}

export interface CreateNodeState {
  nodes: Map<number, Node>;
  nextId: number;
}

export const CreateNodeState = {
  default: {
    nodes: new Map<number, Node>(),
    nextId: 0,
  },
};

export function createNode<T extends Node>(
  type: T["type"],
  props: Omit<T, "type" | "id" | "position" | "source">,
  node: SyntaxNode | null,
  { source, workspace }: { source: SourceFile; workspace: Workspace }
): T {
  const result = {
    type,
    id: workspace._context.node.nextId++,
    position: node ? toPosition(node) : emptyPosition,
    source,
    ...props,
  } as T;

  workspace._context.node.nodes.set(result.id, result);
  return result;
}
