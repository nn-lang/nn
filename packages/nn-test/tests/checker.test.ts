import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";

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
      const options = { cwd: path.join(__dirname, "cases"), fileSystem: TestFileSystem };

      const workspace = await Workspace.create([file], options, parser);
      expect(() => TypeChecker.check(workspace)).not.toThrow();
    });
  });
});
