import {
  CancellationToken,
  DocumentSymbol,
  DocumentSymbolParams,
  SymbolKind,
} from "vscode-languageserver/node";

import { SourceFile } from "@nn-lang/nn-language";
import { Size, TypeChecker, Value } from "@nn-lang/nn-type-checker";

import { TextDocument } from "vscode-languageserver-textdocument";

import { LspContext } from "../types";

export function documentSymbol(
  params: DocumentSymbolParams,
  context: LspContext,
  _token: CancellationToken
): DocumentSymbol[] {
  const document = context.documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const source = SourceFile.parse(document.getText(), params.textDocument.uri);
  const checkContext = TypeChecker.check(source);
 
  const declarationSymbols = Object.values(checkContext.scope.declarations)
    .map<DocumentSymbol>(scope => ({
      name: scope.declaration,
      kind: SymbolKind.Function,
      range: {
        start: document.positionAt(scope.node.position.pos),
        end: document.positionAt(scope.node.position.end),
      },
      selectionRange: {
        start: document.positionAt(scope.node.name.position.pos),
        end: document.positionAt(scope.node.name.position.end),
      },
      children: [
        ...Object.values(scope.values).flatMap(value => valueSymbols(document, value)),
        ...Object.values(scope.sizes).flatMap(size => sizeSymbols(document, size)),
      ],
    }))

  return declarationSymbols;
}

function valueSymbols(document: TextDocument, value: Value): DocumentSymbol {
  return {
    name: value.ident,
    kind: SymbolKind.Variable,
    range: {
      start: document.positionAt(value.first.position.pos),
      end: document.positionAt(value.first.position.end),
    },
    selectionRange: {
      start: document.positionAt(value.first.position.pos),
      end: document.positionAt(value.first.position.end),
    },
    children: [],
  }
}

function sizeSymbols(document: TextDocument, size: Size): DocumentSymbol {
  return {
    name: size.ident,
    kind: SymbolKind.Variable,
    range: {
      start: document.positionAt(size.first.position.pos),
      end: document.positionAt(size.first.position.end),
    },
    selectionRange: {
      start: document.positionAt(size.first.position.pos),
      end: document.positionAt(size.first.position.end),
    },
    children: [],
  };
}
