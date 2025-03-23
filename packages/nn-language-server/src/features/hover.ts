import {
  CancellationToken,
  Hover,
  MarkupContent,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { LspContext } from "../types";

import {
  Declaration,
  getTypeNodeString,
  isAssignmentExpression,
  isCallExpression,
  isDeclaration,
  isIdentifierExpression,
  isIdentifierSizeNode,
  Node,
  nodeOnPosition,
  SourceFile,
} from "@nn-lang/nn-language";

import { Type, TypeChecker } from "@nn-lang/nn-type-checker";

import { MarkdownString } from "../utils";

export async function hover(
  params: TextDocumentPositionParams,
  context: LspContext,
  _token?: CancellationToken
): Promise<Hover | null> {
  const document = context.documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const source = SourceFile.parse(document.getText(), params.textDocument.uri);

  const checkContext = TypeChecker.check(source);
  const hoverPosition = document.offsetAt(params.position);

  const getTypeStringForNode = (node: Node) => {
    const vertex = checkContext.vertices.get(node);
    if (!vertex) {
      return "Unknown";
    }

    return vertex.type.is_some()
      ? Type.toString(vertex.type.unwrap())
      : "Unknown";
  };

  const hoverContent =
    processHover(source.tree, hoverPosition, isIdentifierSizeNode, (node) =>
      new MarkdownString()
        .appendCodeblock(`(size type) ${node.ident.value}`, "nn")
        .toMarkupContent()
    ) ||
    processHover(source.tree, hoverPosition, isIdentifierExpression, (node) => {
      const vertex = checkContext.vertices.get(node);
      if (!vertex) {
        return null;
      }

      const typeString = vertex.type.is_some()
        ? Type.toString(vertex.type.unwrap())
        : "Unknown";

      return new MarkdownString()
        .appendCodeblock(`(value) ${node.ident.value}: ${typeString}`, "nn")
        .toMarkupContent();
    }) ||
    processHover(source.tree, hoverPosition, isCallExpression, (node) => {
      const flow = checkContext.scope.flows[node.callee.value];
      if (!flow) {
        return null;
      }

      const sizeArgs: string[] = flow
        .declaration.node
        .sizeDeclList.decls.map((decl) => decl.value);

      const args: string[] = flow.args.map(
        (arg) => `${arg.ident}: ${getTypeStringForNode(arg.first)}`
      );

      const returnType =
        (flow.returnType && getTypeNodeString(flow.returnType)) ||
        (flow.return && getTypeStringForNode(flow.return)) ||
        "Unknown";

      return new MarkdownString()
        .appendCodeblock(
          `(function) ${node.callee.value}[${sizeArgs.join(", ")}](${args.join(", ")}): ${returnType}`,
          "nn"
        )
        .toMarkupContent();
    }) ||
    processHover(source.tree, hoverPosition, isAssignmentExpression, (node) => {
      const vertex = checkContext.vertices.get(node);
      if (!vertex) {
        return null;
      }

      const typeString = vertex.type.is_some()
        ? Type.toString(vertex.type.unwrap())
        : "Unknown";

      return new MarkdownString()
        .appendCodeblock(`(value) ${node.left.value}: ${typeString}`, "nn")
        .toMarkupContent();
    }) || 
    processHover(source.tree, hoverPosition, isDeclaration, (node) => {
      const flow = checkContext.scope.flows[node.name.value];
      if (!flow) {
        return null;
      }

      const sizeArgs: string[] = flow
        .declaration.node
        .sizeDeclList.decls.map((decl) => decl.value);

      const args: string[] = flow.args.map(
        (arg) => `${arg.ident}: ${getTypeStringForNode(arg.first)}`
      );

      const returnType =
        (flow.returnType && getTypeNodeString(flow.returnType)) ||
        (flow.return && getTypeStringForNode(flow.return)) ||
        "Unknown";

      return new MarkdownString()
        .appendCodeblock(
          `(function) ${node.name.value}[${sizeArgs.join(", ")}](${args.join(", ")}): ${returnType}`,
          "nn"
        )
        .appendMarkdown("\n")
        .appendMarkdown(node.commentLeading.join("\n\n"))
        .appendMarkdown("\n")
        .appendMarkdown(node.commentTrailing.join("\n\n"))
        .toMarkupContent();
    });

  if (!hoverContent) {
    return null;
  }

  const [hoverNode, markdown] = hoverContent;

  return {
    contents: markdown,
    range: {
      start: document.positionAt(hoverNode.position.pos),
      end: document.positionAt(hoverNode.position.end),
    },
  };
}

function processHover<T extends Node>(
  tree: Declaration[],
  hoverPosition: number,
  constraint: (node: Node) => node is T,
  toMarkdown: (node: T) => MarkupContent | null
): [Node, MarkupContent] | null {
  const node = nodeOnPosition(tree, hoverPosition, constraint);

  if (!node) {
    return null;
  }

  const markdown = toMarkdown(node);
  if (!markdown) {
    return null;
  }

  return [node, markdown];
}
