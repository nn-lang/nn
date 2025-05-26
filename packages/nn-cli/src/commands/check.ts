import { compilation, formatDiagnostic } from "../utils";
import { Args, Command } from "@oclif/core";

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

    compilationResult.mapOrElse(
      () => {
        this.exit(0);
      },
      (diagnostics) => {
        console.error(diagnostics.map(formatDiagnostic).join("\n\n"));
        this.exit(1);
      },
    );
  }
}
