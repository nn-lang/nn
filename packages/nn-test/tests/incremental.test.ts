import * as path from "path";
import * as url from "url";

import { Parser as NnParser, Workspace } from "@nn-lang/nn-language";

import { TestFileSystem } from "./utils";

function makeParserProxy(inner: NnParser): {
  proxy: NnParser;
  capturedOldTrees: unknown[];
} {
  const capturedOldTrees: unknown[] = [];
  const proxy: NnParser = {
    parse(content: string, old?: unknown) {
      capturedOldTrees.push(old ?? null);
      return inner.parse(content, old as any);
    },
  };

  return { proxy, capturedOldTrees };
}

describe("incremental parsing", () => {
  it("passes the previous tree to the parser on re-parse", async () => {
    const Parser = require("tree-sitter");
    const language = require("@nn-lang/nn-tree-sitter");

    const innerParser = new Parser();
    innerParser.setLanguage(language);

    const options = {
      cwd: path.join(__dirname, "cases"),
      fileSystem: TestFileSystem,
    };
    const entryFileUri = url.pathToFileURL(
      path.join(options.cwd, "Linear.nn"),
    ).href;

    const { proxy: proxy1, capturedOldTrees: captured1 } =
      makeParserProxy(innerParser);
    const workspace1 = await Workspace.create([entryFileUri], options, proxy1);
    expect(captured1.length).toBeGreaterThan(0);
    expect(captured1[0]).toBeNull();

    const { proxy: proxy2, capturedOldTrees: captured2 } =
      makeParserProxy(innerParser);
    await Workspace.create([entryFileUri], options, proxy2, workspace1);
    expect(captured2.length).toBeGreaterThan(0);
    expect(captured2[0]).not.toBeNull();
  });
});
