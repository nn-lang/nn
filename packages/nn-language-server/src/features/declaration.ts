import {
  CancellationToken,
  Declaration,
  DeclarationParams,
} from "vscode-languageserver/node";
import { LspContext } from "../types";

import {
  isDeclaration,
  isIdentifierExpression,
  isIdentifierSizeNode,
  nodeOnPosition,
  SourceFile,
} from "@nn-lang/nn-language";

import { TypeChecker } from "@nn-lang/nn-type-checker";

export async function declaration(
  params: DeclarationParams,
  context: LspContext,
  _token?: CancellationToken
): Promise<Declaration | null> {
  const document = context.documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const source = SourceFile.parse(document.getText(), params.textDocument.uri);

  const checkContext = TypeChecker.check(source);
  const requestedPosition = document.offsetAt(params.position);

  const identNode = nodeOnPosition(
    source.tree,
    requestedPosition,
    (node) => isIdentifierExpression(node) || isIdentifierSizeNode(node)
  );

  const declarationNode = nodeOnPosition(
    source.tree,
    requestedPosition,
    isDeclaration
  );

  if (!identNode || !declarationNode) {
    return null;
  }

  const declarationScope =
    checkContext.scope.declarations[declarationNode.name.value];

  if (isIdentifierSizeNode(identNode)) {
    const size = declarationScope.sizes[identNode.ident.value];
    return {
      uri: params.textDocument.uri,
      range: {
        start: document.positionAt(size.first.position.pos),
        end: document.positionAt(size.first.position.end),
      },
    };
  }

  if (isIdentifierExpression(identNode)) {
    const value = declarationScope.values[identNode.ident.value];
    return {
      uri: params.textDocument.uri,
      range: {
        start: document.positionAt(value.first.position.pos),
        end: document.positionAt(value.first.position.end),
      },
    };
  }

  return null;
}
