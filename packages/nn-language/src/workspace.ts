import { CreateNodeState, Import, Parser, SourceFile } from ".";

export interface CompilerOptions {
  cwd: string;
  fileSystem: CompilerFileSystem;
}

export interface CompilerFileSystem {
  dirname: (path: string) => string;
  resolve: (...paths: string[]) => string;

  optionResolver: (path: string, options: CompilerOptions) => string;

  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  checkExists: (path: string) => Promise<boolean>;
}

export interface Workspace {
  sources: Map<string, SourceFile>;

  dependencyGraph: Map<string, { path: string; clause: Import }[]>;

  options: CompilerOptions;
  parser: Parser;

  _context: {
    node: CreateNodeState;
  };
}

export namespace Workspace {
  interface ToResolve {
    source: SourceFile;
    dependency: Import;
    targetFile: string;
  }

  export async function create(
    files: string[],
    options: CompilerOptions,
    parser: Parser,
    old?: Workspace,
  ): Promise<Workspace> {
    const fs = options.fileSystem;
    const workspace: Workspace = {
      sources: new Map(),
      dependencyGraph: new Map(),

      options,
      parser,

      _context: { node: CreateNodeState.default },
    };

    const unresolved: ToResolve[] = [];

    await Promise.all(files.map(async (file) => {
      const filePath = options.fileSystem.optionResolver(file, options);

      const sourceFile = await SourceFile.create(
        filePath,
        workspace,
        parser,
        old?.sources.get(filePath),
      );

      const dependencies = sourceFile.dependencies.map((dependency) => ({
        source: sourceFile,
        dependency,
        targetFile: fs.optionResolver(
          fs.resolve(fs.dirname(sourceFile.path), dependency.target),
          options,
        ),
      }));

      workspace.sources.set(filePath, sourceFile);
      workspace.dependencyGraph.set(
        filePath,
        dependencies.map(({ dependency, targetFile }) => ({
          clause: dependency,
          path: targetFile,
        })),
      );

      unresolved.push(...dependencies);
    }));

    while (unresolved.length) {
      const { source, dependency, targetFile } = unresolved.pop()!;

      if (workspace.sources.has(targetFile)) {
        continue;
      }

      if (!(await fs.checkExists(targetFile))) {
        source.diagnostics.push({
          source,
          message: `File not exists: ${dependency.target}`,
          position: dependency.position,
        });

        continue;
      }

      const sourceFile = await SourceFile.create(
        targetFile,
        workspace,
        parser,
        old?.sources.get(targetFile),
      );

      const dependencies = await Promise.all(
        sourceFile.dependencies.map((dependency) => ({
          source: sourceFile,
          dependency,
          targetFile: fs.optionResolver(
            fs.resolve(fs.dirname(sourceFile.path), dependency.target),
            options,
          ),
        })),
      );

      workspace.sources.set(targetFile, sourceFile);
      workspace.dependencyGraph.set(
        targetFile,
        dependencies.map(({ dependency, targetFile }) => ({
          clause: dependency,
          path: targetFile,
        })),
      );

      unresolved.push(...dependencies);
    }

    return workspace;
  }

  export async function addFiles(
    files: string[],
    workspace: Workspace,
  ): Promise<Workspace> {
    const fs = workspace.options.fileSystem;
    const unresolved: ToResolve[] = [];

    await Promise.all(files.map(async (file) => {
      const filePath = fs.optionResolver(file, workspace.options);

      const sourceFile = await SourceFile.create(
        filePath,
        workspace,
        workspace.parser,
        workspace.sources.get(filePath),
      );

      const dependencies = sourceFile.dependencies.map((dependency) => ({
        source: sourceFile,
        dependency,
        targetFile: fs.optionResolver(
          fs.resolve(fs.dirname(sourceFile.path), dependency.target),
          workspace.options,
        ),
      }));

      workspace.sources.set(filePath, sourceFile);
      workspace.dependencyGraph.set(
        filePath,
        dependencies.map(({ dependency, targetFile }) => ({
          clause: dependency,
          path: targetFile,
        })),
      );

      unresolved.push(...dependencies);
    }));

    while (unresolved.length) {
      const { source, dependency, targetFile } = unresolved.pop()!;

      if (workspace.sources.has(targetFile)) {
        continue;
      }

      if (!(await fs.checkExists(targetFile))) {
        source.diagnostics.push({
          source,
          message: `File not exists: ${dependency.target}`,
          position: dependency.position,
        });

        continue;
      }

      const sourceFile = await SourceFile.create(
        targetFile,
        workspace,
        workspace.parser,
        workspace.sources.get(targetFile),
      );

      const dependencies = sourceFile.dependencies.map((dependency) => ({
        source: sourceFile,
        dependency,
        targetFile: fs.optionResolver(
          fs.resolve(fs.dirname(sourceFile.path), dependency.target),
          workspace.options,
        ),
      }));

      workspace.sources.set(targetFile, sourceFile);
      workspace.dependencyGraph.set(
        targetFile,
        dependencies.map(({ dependency, targetFile }) => ({
          clause: dependency,
          path: targetFile,
        })),
      );

      unresolved.push(...dependencies);
    }

    return workspace;
  }
}
