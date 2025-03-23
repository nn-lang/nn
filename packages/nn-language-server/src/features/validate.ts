import { Diagnostic } from "vscode-languageserver/node";
import { URI } from "vscode-uri";

import { SourceFile } from "nn-language";

import { TypeChecker } from "nn-type-checker";

import { LspContext } from "../types";
import { ResourceMap } from "../utils/resourceMap";

export async function validateAllDocuments(
  context: LspContext,
  files: ResourceMap<void>
): Promise<void> {
  for (const file of files.entries) {
    await validateTextDocument(file.resource, context);
  }
}

export async function validateTextDocument(
  textDocumentUri: URI,
  context: LspContext
): Promise<void> {
  const textDocument = context.documents.get(textDocumentUri.toString());
  if (!textDocument) {
    return;
  }

  const source = SourceFile.parse(textDocument.getText(), textDocument.uri);
  const checkContext = TypeChecker.check(source);

  const diagnostics: Diagnostic[] = [];

  [...source.diagnostics, ...checkContext.diagnostics].forEach((diagnostic) => {
    const startPos = textDocument.positionAt(diagnostic.position.pos);
    const endPos = textDocument.positionAt(diagnostic.position.end);

    diagnostics.push({
      range: {
        start: startPos,
        end: endPos,
      },
      severity: 1,
      message: diagnostic.message,
      source: "nn-language-server",
    });
  });

  context.client.sendDiagnostics({
    uri: textDocument.uri,
    diagnostics,
  });
}
