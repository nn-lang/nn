import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";
import * as url from "url";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { TestFileSystem, getErrorJson } from "../utils";

const passes = fs.readdirSync(__dirname);
const ok = passes.filter((f) => f.endsWith(".nn"));

const parser = new Parser();

beforeAll(async () => {
  parser.setLanguage(language as any);
});

describe("parser", () => {
  ok.forEach((file) => {
    test(`✅ ${file} Should be passed`, async () => {
      const options = {
        cwd: path.join(__dirname, "cases"),
        fileSystem: TestFileSystem,
      };

      const filePath = url.pathToFileURL(path.join(__dirname, file)).href;
      const workspace = await Workspace.create([filePath], options, parser);

      const diagnostics = [
        ...[...workspace.sources.values()].flatMap(
          ({ diagnostics }) => diagnostics,
        ),
      ];

      if (diagnostics.length) {
        console.log(diagnostics);
      }

      expect(diagnostics.length).toBe(0);

      const checker = TypeChecker.check(workspace);
      expect(checker).toBeDefined();
      expect(checker.diagnostics.length).toBe(0);

      const checkerDiagnostics = [
        ...[...workspace.sources.values()].flatMap(
          ({ diagnostics }) => diagnostics,
        ),
      ];
      if (checkerDiagnostics.length) {
        console.log(checkerDiagnostics);
      }
      expect(checkerDiagnostics.length).toBe(0);
    });
  });
});
