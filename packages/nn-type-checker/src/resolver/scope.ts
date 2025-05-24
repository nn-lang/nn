import type { Declaration, SourceFile, Workspace } from "@nn-lang/nn-language";

import { Value } from "./value";
import { Size } from "./size";
import { Flow } from "./flow";

export interface WorkspaceScope {
  workspace: Workspace;

  files: Record<string, FileScope>;
}

export interface FileScope {
  workspaceScope: WorkspaceScope;

  path: string;
  file: SourceFile;

  declarations: Record<string, DeclarationScope>;
  flows: Record<string, Flow>;
}

export interface DeclarationScope {
  file: FileScope;

  declaration: string;
  node: Declaration;

  flow?: Flow;
  sizes: Record<string, Size>;
  values: Record<string, Value>;
}

export namespace Scope {
  /**
   * Creates a new workspace scope.
   *
   * @returns a new workspace scope.
   */
  export function makeWorkspace(workspace: Workspace): WorkspaceScope {
    return { workspace, files: {} };
  }

  /**
   * Creates a new file scope.
   *
   * @param path the path to the file
   * @returns a new file scope
   *
   */
  export function makeFile(
    workspaceScope: WorkspaceScope,
    path: string
  ): FileScope {
    return {
      workspaceScope,

      path,
      file: workspaceScope.workspace.sources.get(path)!,

      declarations: {},
      flows: {},
    };
  }

  /**
   * Creates a new declaration scope.
   *
   * @param file the file scope to create the declaration in
   * @param decl the declaration to create the scope for
   * @returns a new declaration scope
   */
  export function makeDeclaration(
    file: FileScope,
    decl: Declaration
  ): DeclarationScope {
    const scope: DeclarationScope = {
      file,
      declaration: decl.name.value,

      node: decl,
      sizes: {},
      values: {},
    };

    return scope;
  }
}
