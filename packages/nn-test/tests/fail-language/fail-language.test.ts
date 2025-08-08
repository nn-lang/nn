import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { TestFileSystem } from "../utils";

const file = fs.readdirSync(__dirname);
const sources = file.filter((f) => f.endsWith(".nn"));

const parser = new Parser();

beforeAll(async () => {
  parser.setLanguage(language as any);
});

describe("fail-language", () => {
  sources.forEach((file) => {
    test(`❌ ${file} Should emit error`, async () => {
      const options = { cwd: path.join(__dirname), fileSystem: TestFileSystem };

      const filePath = path.join(__dirname, file);
      const fileUri = new URL(`file://${filePath}`).href;

      const workspace = await Workspace.create([fileUri], options, parser);
      expect(() => TypeChecker.check(workspace)).not.toThrow();
    });
  });
});
