import * as path from "path";
import * as url from "url";

import { Workspace } from "@nn-lang/nn-language";

import { TestFileSystem } from "./utils";

describe("incremental parser", () => {
  it("reuses previous source tree through Workspace.create old context", async () => {
    const previousTreeArgs: unknown[] = [];
    const parserProxy = {
      parse: (_content: string, old?: unknown) => {
        previousTreeArgs.push(old);

        return {
          rootNode: {
            type: "source_file",
            text: "",
            isError: false,
            children: [],
            namedChildren: [],
            child: () => null,
            childForFieldName: () => null,
            childrenForFieldName: () => [],
          },
        };
      },
    };

    const options = {
      cwd: path.join(__dirname, "cases"),
      fileSystem: TestFileSystem,
    };
    const entryFileUri = url.pathToFileURL(
      path.join(options.cwd, "Linear.nn"),
    ).href;

    const first = await Workspace.create([entryFileUri], options, parserProxy);
    const firstSource = first.sources.get(entryFileUri);

    expect(firstSource).toBeDefined();
    expect(firstSource?._oldTree).toBeDefined();

    previousTreeArgs.length = 0;
    const second = await Workspace.create(
      [entryFileUri],
      options,
      parserProxy,
      first,
    );
    const secondSource = second.sources.get(entryFileUri);

    expect(secondSource).toBeDefined();
    expect(secondSource?._oldTree).toBeDefined();
    expect(secondSource?.declarations.length).toBe(0);
    expect(secondSource?.dependencies.length).toBe(0);
    expect(previousTreeArgs.some((value) => value !== undefined)).toBe(true);
  });
});
