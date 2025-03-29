import * as fs from "fs";
import * as path from "path";
import { exit } from "process";

import Parser from "tree-sitter";
import { Command } from "commander";

import { SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import { onnx, py } from "@nn-lang/nn-codegen";
import { analyze } from "@nn-lang/nn-analyzer";
import language from "@nn-lang/nn-tree-sitter/node";


const program = new Command("nn")
  .version("0.1")
  .argument("<file>", "File to compile")
  .option("-o, --output <output>", "Output python file path")
  .option("-t, --target <target>", "Target flow name to codegen")
  .option(
    "-c, --code <code>",
    "Target framework settings file or framework name"
  )
  .option("-a, --analyze <analyze>", "To analyze flow name")
  .option("-s, --size <size>", "Size map")
  .usage("[options] <file>")
  .showHelpAfterError()
  .parse(process.argv);

const opts = program.opts();
const [filePath] = program.args;

const file = path.resolve(filePath);
const content = fs.readFileSync(file, "utf-8");

async function main() {
  const parser = new Parser();
  parser.setLanguage(language as any);

  const source = SourceFile.parse(content, file, parser);
  const checkContext = TypeChecker.check(source);

  const diagnostics = [...source.diagnostics, ...checkContext.diagnostics];

  if (diagnostics.length) {
    const lines = content.split("\n");

    diagnostics.forEach(({ message, position }) => {
      const [diagnosticLine, diagnosticPos] = (() => {
        let pos = 0;

        const line = lines.findIndex((l) => {
          pos += l.length + 1;
          return pos >= position.pos;
        });

        return [line, position.pos - pos + lines[line].length + 1];
      })();

      const maxLength = String(lines.length).length;
      const errorLine =
        " ".repeat(diagnosticPos + maxLength) +
        "^".repeat(position.end - position.pos);

      const getLinePad = (i: number) => {
        return " ".repeat(maxLength - String(i).length);
      };

      const lower = Math.max(0, diagnosticLine - 2);
      const upper = Math.min(lines.length, diagnosticLine + 2);

      const contextLines = lines.slice(lower, upper);

      contextLines.forEach((l, i) => {
        const line = lower + i;
        console.log(`${line + 1}${getLinePad(line + 1)} | ${l}`);

        if (line === diagnosticLine) {
          const pad = " ".repeat(String(i + 1).length + 2);

          console.log(`${pad}${errorLine}`);
        }
      });

      console.error(
        "\n" +
          `> ${message} ${opts.file}:${diagnosticLine + 1}:${diagnosticPos + 1}`
      );
    });

    exit(1);
  }

  if (opts.analyze) {
    const analyzeResult = analyze(
      checkContext,
      { declaration: opts.analyze },
      { sizeMap: {} }
    );
    console.log(analyzeResult);
  }

  if (opts.code === "python") {
    const settings = py.getSettings(opts.target, (path: string) =>
      fs.readFileSync(path, "utf-8")
    );
    const python = py.codegen(source, checkContext, settings);

    const output =
      opts.output ||
      path.join(
        process.cwd(),
        path.basename(file.replace(/\.nn$/, "") + ".py")
      );

    fs.writeFileSync(output, python);
  }

  if (opts.code === "onnx") {
    if (!opts.size) {
      throw new Error("--size is required");
    }

    const sizeMap = (opts.size as string).split(",").reduce((acc, s) => {
      const [key, value] = s.split("=");
      acc[key] = Number(value);
      return acc;
    }, {} as Record<string, number>);

    const result = onnx.codegen(source, checkContext, {
      version: "0.1",
      target: opts.target,
      sizeMap,
    });

    const output =
      opts.output ||
      path.join(process.cwd(), path.basename(file.replace(/\.nn$/, ".onnx")));

    fs.writeFileSync(output, result);
  }
}

main();

