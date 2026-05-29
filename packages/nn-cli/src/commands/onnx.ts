import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import Codegen from "@nn-lang/nn-codegen";
import { Args, Command, Flags } from "@oclif/core";

import { compilation, formatDiagnostic } from "../utils.js";

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
    const compilationResult = await compilation(filePath);

    const { checker, workspace } = compilationResult.unwrapOrElse(
      (diagnostics) => {
        console.error(diagnostics.map(formatDiagnostic).join("\n\n"));
        this.exit(1);
      },
    );

    const sizeMapResult = flags.size
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .reduce<
        | { ok: true; value: Record<string, number> }
        | { ok: false; message: string }
      >(
        (acc, entry) => {
          if (!acc.ok) {
            return acc;
          }

          const [rawKey, rawValue, ...rest] = entry.split("=");
          if (!rawKey || !rawValue || rest.length > 0) {
            return {
              ok: false,
              message: `Invalid --size entry '${entry}'. Expected KEY=NUMBER format.`,
            };
          }

          const key = rawKey.trim();
          const parsed = Number.parseInt(rawValue.trim(), 10);
          if (key.length === 0 || Number.isNaN(parsed)) {
            return {
              ok: false,
              message: `Invalid --size entry '${entry}'. Value must be an integer.`,
            };
          }

          acc.value[key] = parsed;
          return acc;
        },
        { ok: true, value: {} },
      );

    if (!sizeMapResult.ok) {
      console.error(sizeMapResult.message);
      this.exit(1);
    }

    const sizeMap = sizeMapResult.value;

    const result = Codegen.Onnx.codegen(workspace, checker, {
      version: "0.1",
      target: {
        declaration: flags.target,
        source: pathToFileURL(path.resolve(process.cwd(), args.file)).href,
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
