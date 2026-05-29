import { travel } from "@nn-lang/nn-language";
import type { Node, SourceFile } from "@nn-lang/nn-language";

const position = { pos: 0, end: 0 };

function createSource(): SourceFile {
  return {
    path: "file:///test.nn",
    content: "",
    declarations: [],
    dependencies: [],
    diagnostics: [],
    _oldTree: null,
  };
}

function createNode(source: SourceFile, id: number, type: string): Node {
  return {
    id,
    type,
    position,
    source,
  };
}

describe("utils", () => {
  it("travels compiler nodes without visiting metadata records", () => {
    const source = createSource();
    const ident = createNode(source, 1, "Identifier");
    const typeNode = createNode(source, 2, "TypeNode");
    const argumentList = {
      ...createNode(source, 3, "ArgumentList"),
      args: [{ ident, valueType: typeNode }],
    };

    expect(travel(argumentList, (node) => node.type)).toStrictEqual([
      "ArgumentList",
      "Identifier",
      "TypeNode",
    ]);
  });
});
