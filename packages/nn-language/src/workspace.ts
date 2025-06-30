import { CreateNodeState, Import, Parser, SourceFile } from ".";

export interface CompilerOptions {
  cwd: string;
  fileSystem: CompilerFileSystem;
}

export interface CompilerFileSystem {
  dirname: (path: string) => string;
  resolve: (...paths: string[]) => string;

  dependencyResolver: (
    fromUri: string,
    reference: string,
    options: CompilerOptions,
  ) => string;

  readFile: (uri: string) => Promise<string>;
  writeFile: (uri: string, content: string) => Promise<boolean>;
  checkExists: (uri: string) => Promise<boolean>;
}

export interface Dependency {
  source: SourceFile;
  dependency: Import;
  targetFileUri: string;
}

export interface Workspace {
  /**
   * Source List map
   *
   * K: URI for file
   * V: SourceFile
   */
  sources: Map<string, SourceFile>;

  dependencyGraph: Map<string, Dependency[]>;

  options: CompilerOptions;
  parser: Parser;

  _context: {
    node: CreateNodeState;
  };
}

export namespace Workspace {
  export async function create(
    fileUriList: string[],
    options: CompilerOptions,
    parser: Parser,
    old?: Workspace,
  ): Promise<Workspace> {
    const workspace: Workspace = {
      sources: new Map(),
      dependencyGraph: new Map(),

      options,
      parser,

      _context: { node: CreateNodeState.default },
    };

    return addFiles(fileUriList, workspace);
  }

  export async function addFiles(
    fileUriList: string[],
    workspace: Workspace,
  ): Promise<Workspace> {
    const unresolved: Dependency[] = [];
    const sources = await Promise.all(
      fileUriList.map((uri) => makeSource(uri, workspace)),
    );

    sources.forEach(([source, dependencies]) => {
      workspace.sources.set(source.path, source);
      workspace.dependencyGraph.set(source.path, dependencies);

      unresolved.push(...dependencies);
    });

    while (unresolved.length) {
      const toResolve = unresolved.pop()!;
      const resolved = await resolveDependency(toResolve, workspace);

      if (!resolved) continue;

      const [source, dependencies] = resolved;
      workspace.sources.set(source.path, source);
      workspace.dependencyGraph.set(source.path, dependencies);

      unresolved.push(...dependencies);
    }

    return workspace;
  }

  async function resolveDependency(
    toResolve: Dependency,
    workspace: Workspace,
  ): Promise<[SourceFile, Dependency[]] | undefined> {
    const fs = workspace.options.fileSystem;
    const { source, dependency, targetFileUri } = toResolve;

    if (workspace.sources.has(targetFileUri)) {
      return;
    }

    if (!(await fs.checkExists(targetFileUri))) {
      source.diagnostics.push({
        source,
        message: `File not exists: ${dependency.target}`,
        position: dependency.position,
      });

      return;
    }

    return await makeSource(targetFileUri, workspace);
  }

  async function makeSource(
    fileUri: string,
    workspace: Workspace,
  ): Promise<[SourceFile, Dependency[]]> {
    const fs = workspace.options.fileSystem;

    const sourceFile = await SourceFile.create(
      fileUri,
      workspace,
      workspace.parser,
      workspace.sources.get(fileUri),
    );

    const dependencies: Dependency[] = sourceFile.dependencies.map(
      (dependency) => ({
        source: sourceFile,
        dependency,
        targetFileUri: fs.dependencyResolver(
          fileUri,
          dependency.target,
          workspace.options,
        ),
      }),
    );

    return [sourceFile, dependencies];
  }
}
