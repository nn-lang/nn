import * as path from "path";
import * as url from "url";

import { Parser as NnParser, Workspace } from "@nn-lang/nn-language";

import { TestFileSystem } from "./utils";

/**
 * Creates a proxy around the nn parser that records `oldTree` arguments
 * passed to `parse()`, allowing deterministic verification of incremental
 * parse behaviour without running multiple full build cycles.
 */
function makeParserProxy(inner: NnParser): {
  proxy: NnParser;
  capturedOldTrees: Array<unknown>;
} {
  const capturedOldTrees: Array<unknown> = [];
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Parser = require("tree-sitter");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Language = require("@nn-lang/nn-tree-sitter");

    const innerParser = new Parser();
    innerParser.setLanguage(Language);

    const options = {
      cwd: path.join(__dirname, "cases"),
      fileSystem: TestFileSystem,
    };

    const entryFileUri = url.pathToFileURL(
      path.join(options.cwd, "Linear.nn"),
    ).href;

    // First parse – no old workspace, so oldTree should be null/undefined.
    const { proxy: proxy1, capturedOldTrees: captured1 } =
      makeParserProxy(innerParser);
    const workspace1 = await Workspace.create([entryFileUri], options, proxy1);
    expect(captured1.length).toBeGreaterThan(0);
    expect(captured1[0]).toBeNull();

    // Second parse – supply old workspace so the parser receives the prior tree.
    const { proxy: proxy2, capturedOldTrees: captured2 } =
      makeParserProxy(innerParser);
    await Workspace.create([entryFileUri], options, proxy2, workspace1);
    expect(captured2.length).toBeGreaterThan(0);
    // The old tree from the first parse should be forwarded.
    expect(captured2[0]).not.toBeNull();
  });
});
