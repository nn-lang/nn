import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import Parser from "tree-sitter";

import { TestFileSystem } from "./utils.js";

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const file = fs.readdirSync(path.join(currentDir, "cases"));
const sources = file.filter((f) => f.endsWith(".nn"));

describe("checker", () => {
  sources.forEach((file) => {
    it(`should type check ${file}`, async () => {
      const parser = new Parser();
      parser.setLanguage(language as any);
      const options = {
        cwd: path.join(currentDir, "cases"),
        fileSystem: TestFileSystem,
      };
      const entryFileUri = url.pathToFileURL(path.join(options.cwd, file)).href;

      const workspace = await Workspace.create([entryFileUri], options, parser);
      expect(() => TypeChecker.check(workspace)).not.toThrow();
    });
  });
});
