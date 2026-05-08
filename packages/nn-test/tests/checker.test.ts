import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import Parser from "tree-sitter";

import { TestFileSystem } from "./utils";

const file = fs.readdirSync(path.join(__dirname, "cases"));
const sources = file.filter((f) => f.endsWith(".nn"));

const parser = new Parser();

beforeAll(async () => {
  parser.setLanguage(language as any);
});

describe("checker", () => {
  sources.forEach((file) => {
    it(`should type check ${file}`, async () => {
      const options = {
        cwd: path.join(__dirname, "cases"),
        fileSystem: TestFileSystem,
      };
      const entryFileUri = url.pathToFileURL(path.join(options.cwd, file)).href;

      const workspace = await Workspace.create([entryFileUri], options, parser);
      expect(() => TypeChecker.check(workspace)).not.toThrow();
    });
  });
});
