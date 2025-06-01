import { compilation, formatDiagnostic } from "../utils";
import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";

import Codegen from "@nn-lang/nn-codegen";

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

    const filePath = args.file;
    const compilationResult = compilation(filePath);

    const { checker, workspace } = compilationResult.unwrapOrElse(
      (diagnostics) => {
        console.error(diagnostics.map(formatDiagnostic).join("\n\n"));
        this.exit(1);
      },
    );

    const sizeMap = flags.size.split(",").reduce(
      (acc, s) => {
        const [key, value] = s.split("=");
        key && value && (acc[key] = parseInt(value));
        return acc;
      },
      {} as Record<string, number>,
    );

    const result = Codegen.Onnx.codegen(workspace, checker, {
      version: "0.1",
      target: {
        declaration: flags.target,
        source: path.normalize(path.join(process.cwd(), args.file)),
      },
      sizeMap,
    });

    const output =
      flags.output ||
      path.join(
        process.cwd(),
        path.basename(filePath.replace(/\.nn$/, ".onnx")),
      );

    result.mapOrElse(
      (result) => fs.writeFileSync(output, result),
      (err) => {
        console.error(err);
        this.exit(1);
      },
    );
  }
}
