import { resolve } from "node:path";
import { readFileSync } from "node:fs";

import { Args, Command } from "@oclif/core";

import { compilation, formatDiagnostic } from "../utils";

export default class Check extends Command {
  static args = {
    file: Args.string({
      description: "nn source file path to check",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Check);

    const filePath = resolve(args.file);
    const content = readFileSync(filePath, "utf-8");

    const compilationResult = compilation(filePath, content);

    compilationResult.map_or_else(
      (diagnostics) => {
        const lines = content.split("\n");

        console.error(
          diagnostics
            .map((diagnostic) => formatDiagnostic(filePath, lines, diagnostic))
            .join("\n\n")
        );

        this.exit(1);
      },
      () => { this.exit(0) }
    )
  }
}
