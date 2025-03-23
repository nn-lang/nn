import type { Declaration } from "@nn-lang/nn-language";

import { Value } from "./value";
import { Size } from "./size";
import { Flow } from "./flow";

export interface FileScope {
  path: string;
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
   * Creates a new file scope.
   *
   * @param path the path to the file
   * @returns a new file scope
   * 
   */
  export function makeFile(path: string): FileScope {
    return {
      path,
      declarations: {},
      flows: {}
    };
  }

  /**
   * Creates a new declaration scope.
   * 
   * @param file the file scope to create the declaration in
   * @param decl the declaration to create the scope for
   * @returns a new declaration scope
   */
  export function makeDeclaration(file: FileScope, decl: Declaration): DeclarationScope {
    const scope: DeclarationScope = {
      file,
      declaration: decl.name.value,

      node: decl,
      sizes: {},
      values: {}
    };

    return scope;
  }
  
}
