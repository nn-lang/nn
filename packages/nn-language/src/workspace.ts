import { CreateNodeState, Import, Parser, SourceFile } from ".";
import * as fs from "node:fs";
import path from "path";

export interface CompilerOptions {
  cwd: string;
}

export interface Workspace {
  sources: Map<string, SourceFile>;

  dependencyGraph: Map<string, { path: string; clause: Import }[]>;

  options: CompilerOptions;
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

  export function create(
    files: string[],
    options: CompilerOptions,
    parser: Parser,
    old?: Workspace,
  ): Workspace {
    const workspace: Workspace = {
      sources: new Map(),
      dependencyGraph: new Map(),

      options,
      _context: { node: CreateNodeState.default },
    };

    const unresolved: ToResolve[] = [];

    files.forEach((file) => {
      const filePath = path.normalize(path.join(options.cwd, file));

      const sourceFile = SourceFile.create(
        filePath,
        workspace,
        parser,
        old?.sources.get(filePath),
      );

      const dependencies = sourceFile.dependencies.map((dependency) => ({
        source: sourceFile,
        dependency,
        targetFile: path.normalize(
          path.resolve(path.dirname(sourceFile.path), dependency.target),
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
    });

    while (unresolved.length) {
      const { source, dependency, targetFile } = unresolved.pop()!;

      if (workspace.sources.has(targetFile)) {
        continue;
      }

      if (!fs.existsSync(targetFile)) {
        source.diagnostics.push({
          source,
          message: `File not exists: ${dependency.target}`,
          position: dependency.position,
        });

        continue;
      }

      const sourceFile = SourceFile.create(
        targetFile,
        workspace,
        parser,
        old?.sources.get(targetFile),
      );

      const dependencies = sourceFile.dependencies.map((dependency) => ({
        source: sourceFile,
        dependency,
        targetFile: path.normalize(
          path.resolve(path.dirname(sourceFile.path), dependency.target),
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
