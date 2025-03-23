import {
  CancellationToken,
  CompletionItemKind,
  CompletionList,
  CompletionParams,
} from "vscode-languageserver/node";

import { SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import { isDeclaration, nodeOnPosition } from "@nn-lang/nn-language";

import { LspContext } from "../types";

export async function completion(
  params: CompletionParams,
  context: LspContext,
  _token?: CancellationToken
): Promise<CompletionList | null> {
  const textDocument = context.documents.get(params.textDocument.uri);
  if (!textDocument) {
    return null;
  }

  const source = SourceFile.parse(textDocument.getText(), textDocument.uri);
  const checkContext = TypeChecker.check(source);

  const completionPosition = textDocument.offsetAt(params.position);

  const currentDeclaration = nodeOnPosition(
    source.tree,
    completionPosition,
    isDeclaration
  );

  const flows = Object.values(checkContext.scope.flows);
  const sizes = currentDeclaration
    ? Object.values(
        checkContext.scope.declarations[currentDeclaration.name.value].sizes
      )
    : [];
  const values = currentDeclaration
    ? Object.values(
        checkContext.scope.declarations[currentDeclaration.name.value].values
      )
    : [];

  const completions: CompletionList = {
    items: [
      ...flows.map((flow) => ({
        label: flow.declaration.declaration,
        kind: CompletionItemKind.Function,
        data: {
          uri: textDocument.uri,
          position: flow.declaration.node.position.pos,
        },
      })),
      ...sizes.map((size) => ({
        label: size.ident,
        kind: CompletionItemKind.Variable,
        data: {
          uri: textDocument.uri,
          position: size.first.position.pos,
        },
      })),
      ...values.map((value) => ({
        label: value.ident,
        kind: CompletionItemKind.Variable,
        data: {
          uri: textDocument.uri,
          position: value.first.position.pos,
        },
      })),
    ],
    isIncomplete: false,
  };

  return completions;
}
