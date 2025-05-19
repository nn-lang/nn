import Parser from "tree-sitter";
import { Err, Ok, Result } from "ts-features";

import { Diagnostic, SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import language from "@nn-lang/nn-tree-sitter";

export function formatDiagnostic(
  path: string,
  lines: string[],
  { message, position }: Diagnostic
): string {
  let result = "";

  const [line, pos] = (() => {
    let pos = 0;

    const line = lines.findIndex((l) => {
      pos += l.length + 1;
      return pos >= position.pos;
    });

    return [line, position.pos - pos + lines[line].length + 1];
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

  result += "\n" + `> ${message} ${path}:${line + 1}:${pos + 1}\n`;
  return result;
}

export function compilation(
  path: string,
  content: string
): Result<
  {
    sourceFile: SourceFile;
    checker: TypeChecker;
  },
  Diagnostic[]
> {
  const parser = new Parser();
  parser.setLanguage(language as any);

  const source = SourceFile.parse(content, path, parser);
  const checkContext = TypeChecker.check(source);

  const diagnostics = [...source.diagnostics, ...checkContext.diagnostics];

  if (diagnostics.length) return Err(diagnostics);

  return Ok({
    sourceFile: source,
    checker: checkContext,
  })
}
