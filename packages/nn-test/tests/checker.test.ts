import * as fs from "fs";
import * as path from "path";

import Parser from "tree-sitter";

import { SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import language from "@nn-lang/nn-tree-sitter/node";

const file = fs.readdirSync(path.join(__dirname, "cases"));
const sources = file.filter((f) => f.endsWith(".nn"));

const parser = new Parser();

beforeAll(async () => {
  parser.setLanguage(language as any);
});

describe("checker", () => {
  sources.forEach((file) => {
    it(`should type check ${file}`, async () => {
      const parserInput = fs.readFileSync(
        path.join(__dirname, "cases", file),
        "utf8"
      );

      const source = SourceFile.parse(parserInput, file, parser as any);
      expect(() => TypeChecker.check(source)).not.toThrow();
    });
  });
});
