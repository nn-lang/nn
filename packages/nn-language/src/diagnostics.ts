import type * as TreeSitter from "tree-sitter";

export function getErrorNodes(
  root: TreeSitter.SyntaxNode,
): TreeSitter.SyntaxNode[] {
  const travel = (
    node: TreeSitter.SyntaxNode,
    acc: TreeSitter.SyntaxNode[],
  ): TreeSitter.SyntaxNode[] => {
    if (node.isError) {
      acc.push(node);
      return acc;
    }

    for (const child of node.children) {
      child && travel(child, acc);
    }

    return acc;
  };

  return travel(root, []);
}

export function getMessageForErrorNode(node: TreeSitter.SyntaxNode): string {
  const child = node.child(0);

  if (child && child.type !== "ERROR") {
    return `Unexpected ${child.type}.`;
  } else {
    return `Unexpected token '${node.text}'.`;
  }
}
