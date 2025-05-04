import type * as TreeSitter from "tree-sitter";

import { Declaration } from "./ast";
import { Diagnostic } from "./types";
import { toPosition } from "./utils";
import { Transform } from "./transform/convert";
import { Node, NodeContext } from "./node";

export interface SourceFile {
  path: string;
  content: string;

  oldTree: any;
  tree: Declaration[];

  diagnostics: Diagnostic[];

  _context: {
    node: NodeContext;
  };
}

export interface Parser {
  parse(content: string, old?: any | null): TreeSitter.Tree;
}

export namespace SourceFile {
  function getErrorNodes(root: TreeSitter.SyntaxNode): TreeSitter.SyntaxNode[] {
    const travel = (
      node: TreeSitter.SyntaxNode,
      acc: TreeSitter.SyntaxNode[]
    ): TreeSitter.SyntaxNode[] => {
      if (node.isError) {
        acc.push(node);
        return acc;
      }

      for (const child of node.children) {
        child && travel(child, acc);
      }

      return acc;
    };

    return travel(root, []);
  }

  function getMessageForErrorNode(node: TreeSitter.SyntaxNode): string {
    const child = node.child(0);

    if (child && child.type !== "ERROR") {
      return `Unexpected ${child.type}.`;
    } else {
      return `Unexpected token '${node.text}'.`;
    }
  }

  export function parse(
    content: string,
    path: string,
    parser: Parser,
    old?: SourceFile
  ): SourceFile {
    const tree = parser.parse(content, old?.oldTree);
    const context: SourceFile = old ?? {
      content,
      path,
      oldTree: parse,
      tree: [],
      diagnostics: [],
      _context: {
        node: {
          nextId: 0,
          nodes: new Map<number, Node>(),
        }
      }
    };

    context.diagnostics = getErrorNodes(tree.rootNode).map((node) => ({
      message: getMessageForErrorNode(node),
      position: toPosition(node),
    }));

    context.tree = Transform.TreeSitter.sourceFile(tree, context)

    return context;
  }
}

export * from "./ast";
export * from "./ast-is";
export * from "./node";
export * from "./types";
export * from "./utils";
