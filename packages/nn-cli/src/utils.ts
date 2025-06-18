import * as fs from "node:fs/promises";
import * as path from "node:path";
import { cwd } from "node:process";
import Parser from "tree-sitter";
import { Result, err, ok } from "ts-features";

import {
  CompilerFileSystem,
  Diagnostic,
  Workspace,
} from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";

export const CliFileSystem: CompilerFileSystem = {
  dirname: (filePath) => path.normalize(path.dirname(filePath)),
  resolve: (...paths) => path.normalize(path.join(...paths)),

  optionResolver: (filePath, options) =>
    path.normalize(path.join(options.cwd, filePath)),

  readFile: async (path) => fs.readFile(path, "utf-8"),
  writeFile: async (path, content) => {
    try {
      await fs.writeFile(path, content);
      return true;
    } catch {
      return false;
    }
  },
  checkExists: async (path) => {
    try {
      await fs.access(path, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  },
};

export function formatDiagnostic({
  source,
  message,
  position,
}: Diagnostic): string {
  const lines = source.content.split("\n");
  let result = "";

  const [line, pos] = (() => {
    let pos = 0;

    const line = lines.findIndex((l) => {
      pos += l.length + 1;
      return pos >= position.pos;
    });

    return [line, position.pos - pos + lines[line]!.length + 1];
  })();

  const maxLength = String(lines.length).length;
  const errorLine =
    " ".repeat(pos + maxLength) + "^".repeat(position.end - position.pos);

  const getLinePad = (i: number) => {
    return " ".repeat(maxLength - String(i).length);
  };

  const lower = Math.max(0, line - 2);
  const upper = Math.min(lines.length, line + 2);

  const contextLines = lines.slice(lower, upper);

  contextLines.forEach((l, i) => {
    const contextLine = lower + i;
    result += `${contextLine + 1}${getLinePad(contextLine + 1)} | ${l}\n`;

    if (contextLine === line) {
      const pad = " ".repeat(String(i + 1).length + 2);
      result += `${pad}${errorLine}\n`;
    }
  });

  result += "\n" + `> ${message} ${source.path}:${line + 1}:${pos + 1}\n`;
  return result;
}

export async function compilation(path: string): Promise<Result<
  {
    workspace: Workspace;
    checker: TypeChecker;
  },
  Diagnostic[]
>> {
  const parser = new Parser();
  parser.setLanguage(language as any);

  const options = { cwd: cwd(), fileSystem: CliFileSystem };

  const workspace = await Workspace.create([path], options, parser);
  const checker = TypeChecker.check(workspace);

  const diagnostics = [
    ...[...workspace.sources.values()].flatMap(
      ({ diagnostics }) => diagnostics,
    ),
    ...checker.diagnostics,
  ];

  if (diagnostics.length) return err(diagnostics);

  return ok({
    workspace,
    checker,
  });
}
