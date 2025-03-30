import type { Node as SyntaxNode } from "web-tree-sitter";

import { Declaration } from "./ast";
import { Diagnostic } from "./types";
import { toPosition } from "./utils";
import { convertDeclaration } from "./convert";
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
  parse(content: string, old?: any | null): any;
}

export namespace SourceFile {
  function getErrorNodes(root: SyntaxNode): SyntaxNode[] {
    const travel = (
      node: SyntaxNode,
      acc: SyntaxNode[]
    ): SyntaxNode[] => {
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

  function getMessageForErrorNode(node: SyntaxNode): string {
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
    const parse = parser.parse(content, old?.oldTree);
    const result: SourceFile = old ?? {
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

    result.diagnostics = getErrorNodes(parse.rootNode).map((node) => ({
      message: getMessageForErrorNode(node),
      position: toPosition(node),
    }));

    result.tree = parse.rootNode.children
      .filter((node: any) => node.type === "declaration")
      .map((declNode: any) => convertDeclaration(declNode, result));

    return result;
  }
}

export * from "./ast";
export * from "./ast-is";
export * from "./node";
export * from "./types";
export * from "./utils";
