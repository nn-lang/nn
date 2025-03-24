import { 
  CancellationTokenSource,
  DidCloseTextDocumentParams, 
  DidOpenTextDocumentParams,
  TextDocumentChangeEvent
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import { validateAllDocuments } from "./validate";

import { LspContext } from "../types";
import { getOrderedFileSet, ResourceMap } from "../utils/resourceMap";
import { Delayer } from "../utils/delayer";

const pendingDiagnostics = new ResourceMap<number>()
const diagnosticDelayer = new Delayer(300);
let pendingErr: GetErrRequest | undefined = undefined;

class GetErrRequest {
  public static executeGetErrRequest(
    context: LspContext,
    files: ResourceMap<void>,
    onDone: () => void,
  ) {
    return new GetErrRequest(context, files, onDone);
  }

  private _done: boolean = false;
  private readonly _token: CancellationTokenSource = new CancellationTokenSource();

  private constructor(
    context: LspContext,
    public readonly files: ResourceMap<void>,
    onDone: () => void,
  ) {
    const allFiles = [...files.entries]

    if (!allFiles.length) {
      this._done = true;
      setImmediate(onDone);
    } else {
      const request = validateAllDocuments(context, files);

      request.finally(() => {
        if (this._done) {
          return;
        }
        this._done = true;
        onDone();
      });
    }
  }

  public cancel(): any {
    if (!this._done) {
      this._token.cancel();
    }

    this._token.dispose();
  }
}

export function openTextDocument(_params: DidOpenTextDocumentParams, _context: LspContext): void {
  // TODO
}

export function onDidCloseTextDocument(params: DidCloseTextDocumentParams, context: LspContext): void {
  pendingDiagnostics.delete(URI.parse(params.textDocument.uri));

  if (pendingErr) {
    pendingErr.cancel();
    pendingErr = undefined;
  }

  const document = context.documents.get(params.textDocument.uri);
  if (document) {
    context.client.sendDiagnostics({
      uri: params.textDocument.uri,
      diagnostics: [],
    });
  }
}

export function onDidChangeTextDocument(params: TextDocumentChangeEvent<TextDocument>, context: LspContext): void {
  function sendPendingDiagnostics() {
    const orderedFileSet = getOrderedFileSet(pendingDiagnostics);

    if (pendingErr) {
      pendingErr.cancel();

      [...pendingErr.files.entries].forEach(({ resource }) => {
        orderedFileSet.set(resource, undefined);
      })

      pendingErr = undefined
    }

    if (orderedFileSet.size) {
      pendingErr = GetErrRequest.executeGetErrRequest(context, orderedFileSet, () => {
        pendingErr = undefined;
      });
    }
  }
  
  function requestDiagnostic(document: TextDocument) {
    pendingDiagnostics.set(URI.parse(document.uri), Date.now());
  
    const delay = 300;
    diagnosticDelayer.trigger(() => {
      sendPendingDiagnostics();
    }, delay);
  }

  const textDocument = params.document;
  if (!textDocument) {
    return;
  }

  const document = context.documents.get(textDocument.uri);
  if (!document) {
    return;
  }
  
  requestDiagnostic(document);
}




