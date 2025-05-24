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

    const filePath = args.file;
    const compilationResult = compilation(filePath);

    compilationResult.map_or_else(
      (diagnostics) => {
        console.error(diagnostics.map(formatDiagnostic).join("\n\n"));
        this.exit(1);
      },
      () => {
        this.exit(0);
      }
    );
  }
}
