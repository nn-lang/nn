import { DocumentSymbolParams, SemanticTokens, SemanticTokensBuilder, SymbolKind } from "vscode-languageserver";
import { LspContext } from "../types";

import {
  isCallExpression,
  SourceFile,
  travel,
} from '@nn-lang/nn-language'

export function semanticTokens(params: DocumentSymbolParams, context: LspContext): SemanticTokens {
  const document = context.documents.get(params.textDocument.uri);
  const builder = new SemanticTokensBuilder();

  if (!document) {
    console.warn(`Document not found: ${params.textDocument.uri}`);
    return builder.build();
  }

  const source = SourceFile.parse(document.getText(), params.textDocument.uri);
  const callExpressions = travel(source.tree, isCallExpression);

  for (const decl of source.tree) {
    const { position } = decl.name;
    const startPos = document.positionAt(position.pos);

    builder.push(startPos.line, startPos.character, position.end - position.pos, SymbolKind.Function, 0);
  }

  for (const call of callExpressions) {
    const { position } = call.callee;
    const startPos = document.positionAt(position.pos);

    builder.push(startPos.line, startPos.character, position.end - position.pos, SymbolKind.Function, 0);
  }

  return builder.build();
}
