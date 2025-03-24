import { createConnection, MessageType, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument';

import { LspClient } from './client';

import { 
  onDidChangeTextDocument,
  onDidCloseTextDocument, 
  openTextDocument 
} from './features/document';
import { initialize } from './features/initialize';
import { completion } from './features/completion';
import { hover } from './features/hover';
import { semanticTokens } from './features/sementicTokens';
import { declaration } from './features/declaration';
import { rename } from './features/rename';

import { LspContext } from './types';
import { LspClientLogger } from './utils/Logger';

export interface LspConnectionOptions {
  showMessageLevel: MessageType;
}

export function createLspConnection(options: LspConnectionOptions) {
  const connection = createConnection(ProposedFeatures.all);
  const client = new LspClient(connection);
  const logger = new LspClientLogger(client, options.showMessageLevel);
  const documents = new TextDocuments(TextDocument);

  const context: Partial<LspContext> = {
    logger,
    client,
    documents,
    showMessageLevel: options.showMessageLevel
  }

  connection.onDidOpenTextDocument((params) => openTextDocument(params, context as LspContext))
  connection.onDidCloseTextDocument((params) => onDidCloseTextDocument(params, context as LspContext))
  documents.onDidChangeContent((params) => onDidChangeTextDocument(params, context as LspContext))

  connection.onInitialize((params) => initialize(params, context))
  connection.onCompletion((params, token) => completion(params, context as LspContext, token))
  connection.onHover((params, token) => hover(params, context as LspContext, token))
  connection.onDeclaration((params, token) => declaration(params, context as LspContext, token))
  connection.onDefinition((params, token) => declaration(params, context as LspContext, token))
  connection.onRenameRequest((params, token) => rename(params, context as LspContext, token))

  connection.languages.semanticTokens.on((params) => semanticTokens(params, context as LspContext))

  documents.listen(connection);
  return connection;
}
