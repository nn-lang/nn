import * as path from "path";
import * as url from "url";

import { Workspace } from "@nn-lang/nn-language";
import type { Parser as NnParser } from "@nn-lang/nn-language";
import language from "@nn-lang/nn-tree-sitter";
import Parser from "tree-sitter";

import { TestFileSystem } from "./utils.js";

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));

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
    const innerParser = new Parser();
    innerParser.setLanguage(language as any);

    const options = {
      cwd: path.join(currentDir, "cases"),
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
