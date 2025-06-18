import * as fs from "node:fs/promises";
import * as path from "path";

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
