import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { Args, Command, Flags } from "@oclif/core";

import Codegen from "@nn-lang/nn-codegen";

import { compilation, formatDiagnostic } from "../utils";


export default class Onnx extends Command {
  static args = {
    file: Args.string({
      description: "File to compile",
      required: true,
    }),
  };

  static description = "Compile nn source code to onnx graph";

  static flags = {
    output: Flags.string({
      char: "o",
      description: "Output file path, defaults to {filename}.onnx",
    }),
    target: Flags.string({
      char: "t",
      description: "Target flow name to codegen",
      required: true,
    }),
    size: Flags.string({
      char: "s",
      description: "Size map for static compilation",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Onnx);

    const filePath = resolve(args.file);
    const content = readFileSync(filePath, "utf-8");

    const compilationResult = compilation(filePath, content);

    const { checker, sourceFile } = compilationResult.unwrap_or_else(
      (diagnostics) => {
        const lines = content.split("\n");

        console.error(
          diagnostics
            .map((diagnostic) => formatDiagnostic(filePath, lines, diagnostic))
            .join("\n\n")
        );

        this.exit(1);
      }
    );

    const sizeMap = flags.size.split(",").reduce((acc, s) => {
      const [key, value] = s.split("=");
      acc[key] = Number(value);
      return acc;
    }, {} as Record<string, number>);

    const result = Codegen.Onnx.codegen(sourceFile, checker, {
      version: "0.1",
      target: flags.target,
      sizeMap,
    });

    const output =
      flags.output ||
      join(process.cwd(), basename(filePath.replace(/\.nn$/, ".onnx")));

    writeFileSync(output, result);
  }
}
