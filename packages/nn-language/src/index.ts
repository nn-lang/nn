import type * as TreeSitter from "tree-sitter";

import { Declaration, Import } from "./ast";
import { getErrorNodes, getMessageForErrorNode } from "./diagnostics";
import { Transform } from "./transform/tree-sitter";
import { Diagnostic } from "./types";
import { toPosition } from "./utils";
import { Workspace } from "./workspace";

export interface SourceFile {
  path: string;
  content: string;

  declarations: Declaration[];
  dependencies: Import[];

  diagnostics: Diagnostic[];
  _oldTree: TreeSitter.Tree | null;
}

export interface Parser {
  parse(content: string, old?: any | null): TreeSitter.Tree;
}

export namespace SourceFile {
  export async function create(
    path: string,
    workspace: Workspace,
    parser: Parser,
    old?: SourceFile,
  ): Promise<SourceFile> {
    const fs = workspace.options.fileSystem;
    const content = await fs.readFile(path);

    const tree = parser.parse(content, old?._oldTree);
    const context: SourceFile = old ?? {
      content,
      path,
      _oldTree: tree,
      declarations: [],
      dependencies: [],
      diagnostics: [],
    };

    const diagnostics: Diagnostic[] = getErrorNodes(tree.rootNode).map(
      (node) => ({
        source: context,
        message: getMessageForErrorNode(node),
        position: toPosition(node),
      }),
    );

    const { declarations, imports } = Transform.TreeSitter.sourceFile(tree, {
      source: context,
      workspace,
    });

    context.diagnostics = diagnostics;
    context.declarations = declarations;
    context.dependencies = imports;

    return context;
  }
}

export * from "./ast";
export * from "./ast-is";
export * from "./node";
export * from "./types";
export * from "./utils";
export * from "./workspace";
export * from "./diagnostics";
