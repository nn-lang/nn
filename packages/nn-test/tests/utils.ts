import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

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

  dependencyResolver: (fromUri, reference, options) =>
    url.resolve(fromUri, reference),

  readFile: async (fileUri) => fs.readFile(url.fileURLToPath(fileUri), "utf-8"),

  writeFile: async (fileUri, content) => {
    try {
      await fs.writeFile(url.fileURLToPath(fileUri), content);
      return true;
    } catch {
      return false;
    }
  },
  checkExists: async (fileUri) => {
    try {
      await fs.access(url.fileURLToPath(fileUri), fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  },
};
