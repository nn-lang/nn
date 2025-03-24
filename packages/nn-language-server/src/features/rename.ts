import {
  CancellationToken,
  RenameParams,
  TextEdit,
  WorkspaceEdit,
} from "vscode-languageserver/node";

import {
  CallExpression,
  Declaration,
  isCallExpression,
  isDeclaration,
  isIdentifier,
  isIdentifierExpression,
  isIdentifierSizeNode,
  isSizeDeclList,
  Node,
  nodeOnPosition,
  SourceFile,
  travel,
} from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { LspContext } from "../types";
import { between } from "../utils";

export async function rename(
  params: RenameParams,
  context: LspContext,
  _token: CancellationToken
): Promise<WorkspaceEdit | null> {
  const textDocument = context.documents.get(params.textDocument.uri);
  if (!textDocument) {
    return null;
  }

  const source = SourceFile.parse(textDocument.getText(), textDocument.uri);
  const checkContext = TypeChecker.check(source);

  const renamePosition = textDocument.offsetAt(params.position);

  const processed =
    processRename(source.tree, renamePosition, isIdentifierSizeNode, (node) => {
      const declaration = nodeOnPosition(
        source.tree,
        node.position.pos,
        isDeclaration
      );
      if (!declaration) return null;

      const scope = checkContext.scope.declarations[declaration.name.value];
      if (!scope) return null;

      const size = scope.sizes[node.ident.value];

      return [...size.nodes].map((node) => ({
        range: {
          start: textDocument.positionAt(node.position.pos),
          end: textDocument.positionAt(node.position.end),
        },
        newText: params.newName,
      }));
    }) ||
    processRename(
      source.tree,
      renamePosition,
      isIdentifierExpression,
      (node) => {
        const declaration = nodeOnPosition(
          source.tree,
          node.position.pos,
          isDeclaration
        );
        if (!declaration) return null;

        const scope = checkContext.scope.declarations[declaration.name.value];
        if (!scope) return null;

        const value = scope.values[node.ident.value];

        return [...value.nodes].map((node) => ({
          range: {
            start: textDocument.positionAt(node.position.pos),
            end: textDocument.positionAt(node.position.end),
          },
          newText: params.newName,
        }));
      }
    ) ||
    processRename(source.tree, renamePosition, isSizeDeclList, (node) => {
      const actual = nodeOnPosition(node, renamePosition, isIdentifier);
      if (!actual) return null;

      const declaration = nodeOnPosition(
        source.tree,
        node.position.pos,
        isDeclaration
      );
      if (!declaration) return null;

      const scope = checkContext.scope.declarations[declaration.name.value];
      if (!scope) return null;

      const size = scope.sizes[actual.value];
      if (!size) return null;

      return [...size.nodes].map((node) => ({
        range: {
          start: textDocument.positionAt(node.position.pos),
          end: textDocument.positionAt(node.position.end),
        },
        newText: params.newName,
      }));
    }) ||
    processRename(source.tree, renamePosition, isCallExpression, (node) => {
      const actual = between(
        node.callee.position.pos,
        node.callee.position.end
      )(renamePosition)
        ? node.callee
        : null;
      if (!actual) return null;

      const original = checkContext.scope.flows[actual.value].declaration.node;
      const calls = travel<CallExpression>(source.tree, (node) => {
        return isCallExpression(node) && node.callee.value === actual.value;
      });

      return [
        {
          range: {
            start: textDocument.positionAt(original.name.position.pos),
            end: textDocument.positionAt(original.name.position.end),
          },
          newText: params.newName,
        },
        ...calls.map((node) => ({
          range: {
            start: textDocument.positionAt(node.callee.position.pos),
            end: textDocument.positionAt(node.callee.position.end),
          },
          newText: params.newName,
        })),
      ];
    }) ||
    processRename(source.tree, renamePosition, isDeclaration, (node) => {
      const actual = between(
        node.name.position.pos,
        node.name.position.end
      )(renamePosition)
        ? node.name
        : null;
      if (!actual) return null;

      const calls = travel<CallExpression>(source.tree, (node) => {
        return isCallExpression(node) && node.callee.value === actual.value;
      });

      return [
        {
          range: {
            start: textDocument.positionAt(actual.position.pos),
            end: textDocument.positionAt(actual.position.end),
          },
          newText: params.newName,
        },
        ...calls.map((node) => ({
          range: {
            start: textDocument.positionAt(node.callee.position.pos),
            end: textDocument.positionAt(node.callee.position.end),
          },
          newText: params.newName,
        })),
      ];
    });

  if (!processed) return null;

  const [, changes] = processed;

  return {
    changes: {
      [textDocument.uri]: changes,
    },
  };
}

function processRename<T extends Node>(
  tree: Declaration[],
  hoverPosition: number,
  constraint: (node: Node) => node is T,
  toChanges: (node: T) => TextEdit[] | null
): [T, TextEdit[]] | null {
  const node = nodeOnPosition(tree, hoverPosition, constraint);

  if (!node) {
    return null;
  }

  const changes = toChanges(node);
  if (!changes) {
    return null;
  }

  return [node, changes];
}
