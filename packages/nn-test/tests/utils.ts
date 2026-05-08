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

function isFileUri(value: string): boolean {
  return value.startsWith("file://");
}

function toFilePath(uriOrPath: string): string {
  return isFileUri(uriOrPath) ? url.fileURLToPath(uriOrPath) : uriOrPath;
}

function resolveDependencyPath(
  fromUri: string,
  reference: string,
  cwd: string,
): string {
  if (isFileUri(fromUri)) {
    return new url.URL(reference, fromUri).href;
  }

  const basePath = path.isAbsolute(fromUri)
    ? fromUri
    : path.resolve(cwd, fromUri);
  const referencePath = isFileUri(reference)
    ? url.fileURLToPath(reference)
    : reference;

  return path.resolve(path.dirname(basePath), referencePath);
}

export const TestFileSystem: CompilerFileSystem = {
  dirname: (filePath) => path.normalize(path.dirname(filePath)),
  resolve: (...paths) => path.normalize(path.join(...paths)),

  dependencyResolver: (fromUri, reference, options) =>
    resolveDependencyPath(fromUri, reference, options.cwd),

  readFile: async (fileUri) => fs.readFile(toFilePath(fileUri), "utf-8"),

  writeFile: async (fileUri, content) => {
    try {
      await fs.writeFile(toFilePath(fileUri), content);
      return true;
    } catch {
      return false;
    }
  },
  checkExists: async (fileUri) => {
    try {
      await fs.access(toFilePath(fileUri), fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  },
};
