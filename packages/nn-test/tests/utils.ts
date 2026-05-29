import * as fs from "node:fs/promises";
import * as path from "node:path";

import { CompilerFileSystem } from "@nn-lang/nn-language";

export async function getErrorJson(dirname: string, source: string) {
  const sourceWithoutExt = source.replace(".nn", "");
  const filePath: string = path.join(
    dirname,
    "cases",
    `${sourceWithoutExt}.error.json`,
  );

  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export const TestFileSystem: CompilerFileSystem = {
  dirname: CompilerFileSystem.dirname,
  resolve: CompilerFileSystem.resolve,

  dependencyResolver: (fromUri, reference, options) =>
    CompilerFileSystem.resolveDependencyPath(fromUri, reference, options.cwd),

  readFile: async (fileUri) =>
    fs.readFile(CompilerFileSystem.toFilePath(fileUri), "utf-8"),

  writeFile: async (fileUri, content) => {
    try {
      await fs.writeFile(CompilerFileSystem.toFilePath(fileUri), content);
      return true;
    } catch {
      return false;
    }
  },
  checkExists: async (fileUri) => {
    try {
      await fs.access(
        CompilerFileSystem.toFilePath(fileUri),
        fs.constants.R_OK,
      );
      return true;
    } catch {
      return false;
    }
  },
};
