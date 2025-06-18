import * as fs from "fs";
import * as path from "path";
import Parser from "tree-sitter";

import { Workspace } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";

import { TestFileSystem, getErrorJson } from "./utils";

const file = fs.readdirSync(path.join(__dirname, "cases"));

const sources = file.filter((f) => f.endsWith(".nn"));
const errors = file.filter((f) => f.endsWith(".error.json"));

const ok = sources.filter(
  (f) => !errors.includes(`${f.replace(".nn", "")}.error.json`),
);
const err = sources.filter((f) =>
  errors.includes(`${f.replace(".nn", "")}.error.json`),
);

const parser = new Parser();

beforeAll(async () => {
  parser.setLanguage(language as any);
});

describe("parser", () => {
  ok.forEach((file) => {
    it(`should parse ${file}`, async () => {
      const options = {
        cwd: path.join(__dirname, "cases"),
        fileSystem: TestFileSystem,
      };
      const workspace = await Workspace.create([file], options, parser);

      const diagnostics = [
        ...[...workspace.sources.values()].flatMap(
          ({ diagnostics }) => diagnostics,
        ),
      ];

      if (diagnostics.length) {
        console.log(diagnostics);
      }

      expect(diagnostics.length).toBe(0);
    });
  });

  err.forEach((file) => {
    it(`should emit errors at ${file}`, async () => {
      const options = {
        cwd: path.join(__dirname, "cases"),
        fileSystem: TestFileSystem,
      };

      const errorJson = await getErrorJson(__dirname, file);
      const workspace = await Workspace.create([file], options, parser);

      const diagnostics = [
        ...[...workspace.sources.values()].flatMap(
          ({ diagnostics }) => diagnostics,
        ),
      ].map(({ message, position }) => ({ message, position }));

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics).toStrictEqual(errorJson);
    });
  });
});
