import { Node as SyntaxNode } from "web-tree-sitter";

import {
  ArgumentList,
  ArithmeticSizeNode,
  AssignmentExpression,
  CallExpression,
  Declaration,
  Expression,
  Identifier,
  IdentifierExpression,
  IdentifierSizeNode,
  NumberSizeNode,
  SizeDeclList,
  SizeNode,
  StringLiteralExpression,
  TupleExpression,
  TypeNode,
} from "./ast";
import { createNode } from "./node";
import { SourceFile } from "./index";

function convertIdentifier(
  node: SyntaxNode | null,
  _context: SourceFile
): Identifier {
  if (!node) {
    throw new Error(`Expected an identifier node, got null`);
  }

  return createNode("Identifier", { value: node.text }, node, _context);
}

function convertSizeDeclList(
  node: SyntaxNode | null,
  context: SourceFile
): SizeDeclList {
  return node
    ? createNode(
        "SizeDeclList",
        {
          decls: node!.namedChildren.map((child) =>
            convertIdentifier(child, context)
          ),
        },
        node,
        context
      )
    : createNode("SizeDeclList", { decls: [] }, null, context);
}

function convertArgumentList(
  node: SyntaxNode | null,
  context: SourceFile
): ArgumentList {
  return node
    ? createNode(
        "ArgumentList",
        {
          args: node.namedChildren
            .filter((child) => child !== null)
            .map((child) => ({
              ident: convertIdentifier(child.child(0), context),
              valueType: convertTypeNode(child.child(2), context),
            })),
        },
        node,
        context
      )
    : createNode("ArgumentList", { args: [] }, null, context);
}

export function convertDeclaration(
  node: SyntaxNode,
  context: SourceFile
): Declaration {
  return createNode(
    "Declaration",
    {
      name: convertIdentifier(node.childForFieldName("name"), context),
      sizeDeclList: convertSizeDeclList(
        node.childForFieldName("sizeDeclList"),
        context
      ),
      argumentList: convertArgumentList(
        node.childForFieldName("argumentList"),
        context
      ),
      returnType: node.childForFieldName("returnType")
        ? convertTypeNode(node.childForFieldName("returnType"), context)
        : undefined,

      firstPipe: node.childForFieldName("firstPipe") !== null,
      exprs: node.childForFieldName("expressions")
        ? [
            node.childForFieldName("expr_first"),
            ...node.childrenForFieldName("expr_last"),
          ].map((child) => convertExpression(child, context))
        : [],

      commentLeading: node
        .childrenForFieldName("commentLeading")
        .filter((child) => child !== null)
        .map((child) => child.text.slice(1).trim()),
      commentTrailing: node
        .childrenForFieldName("commentTrailing")
        .filter((child) => child !== null)
        .map((child) => child.text.slice(1).trim()),
    },
    node,
    context
  );
}

function convertTypeNode(
  node: SyntaxNode | null,
  context: SourceFile
): TypeNode {
  if (!node) {
    throw new Error("Expected a type node");
  }

  return createNode(
    "TypeNode",
    {
      isTensor: true,
      sizes: node.child(1)
        ? node
            .child(1)!
            .namedChildren.map((child) => convertSizeNode(child, context))
        : [],
    },
    node,
    context
  );
}

function convertSizeNode(
  node: SyntaxNode | null,
  context: SourceFile
): SizeNode {
  if (!node) {
    throw new Error("Expected a size node");
  }

  switch (node.type) {
    case "size":
    case "size_operation":
      return convertSizeNode(node.child(0), context);
    case "size_pow":
      return createNode<ArithmeticSizeNode>(
        "ArithmeticSizeNode",
        {
          left: convertSizeNode(node.child(0), context),
          right: convertSizeNode(node.child(2), context),
          sizeType: "pow",
        },
        node,
        context
      );
    case "size_mul":
      return createNode<ArithmeticSizeNode>(
        "ArithmeticSizeNode",
        {
          left: convertSizeNode(node.child(0), context),
          right: convertSizeNode(node.child(2), context),
          sizeType: "mul",
        },
        node,
        context
      );
    case "size_div":
      return createNode<ArithmeticSizeNode>(
        "ArithmeticSizeNode",
        {
          left: convertSizeNode(node.child(0), context),
          right: convertSizeNode(node.child(2), context),
          sizeType: "div",
        },
        node,
        context
      );
    case "size_add":
      return createNode<ArithmeticSizeNode>(
        "ArithmeticSizeNode",
        {
          left: convertSizeNode(node.child(0), context),
          right: convertSizeNode(node.child(2), context),
          sizeType: "add",
        },
        node,
        context
      );
    case "size_sub":
      return createNode<ArithmeticSizeNode>(
        "ArithmeticSizeNode",
        {
          left: convertSizeNode(node.child(0), context),
          right: convertSizeNode(node.child(2), context),
          sizeType: "sub",
        },
        node,
        context
      );
    case "size_ident":
      return createNode<IdentifierSizeNode>(
        "IdentifierSizeNode",
        {
          ident: convertIdentifier(node.child(0), context),
          sizeType: "ident",
        },
        node,
        context
      );
    case "size_number":
      return createNode<NumberSizeNode>(
        "NumberSizeNode",
        {
          number: parseInt(node.text),
          sizeType: "number",
        },
        node,
        context
      );
    case "size_paren":
      return convertSizeNode(node.child(1), context);
  }

  throw new Error(`Unknown size node type: ${node.type}`);
}

function convertCallExpression(
  node: SyntaxNode | null,
  context: SourceFile
): CallExpression {
  if (!node) {
    throw new Error("Expected a call expression node");
  }

  return createNode(
    "CallExpression",
    {
      callee: convertIdentifier(node.child(0), context),
      sizes: node.child(1)
        ? node
            .child(1)!
            .namedChildren.map((child) => convertSizeNode(child, context))
        : [],
      args: node.children
        .filter((child) => child !== null && child.type.includes("expression"))
        .map((child) => convertExpression(child, context)),
    },
    node,
    context
  );
}

function convertTupleExpression(
  node: SyntaxNode | null,
  context: SourceFile
): TupleExpression {
  if (!node) {
    throw new Error("Expected a tuple expression node");
  }

  return createNode(
    "TupleExpression",
    {
      elements: node.namedChildren.map((child) =>
        convertExpression(child, context)
      ),
    },
    node,
    context
  );
}

function convertAssignmentExpression(
  node: SyntaxNode | null,
  context: SourceFile
): AssignmentExpression {
  if (!node) {
    throw new Error("Expected an assignment expression node");
  }

  return createNode(
    "AssignmentExpression",
    {
      left: convertIdentifier(node.child(0), context),
      right: convertExpression(node.child(2), context),
    },
    node,
    context
  );
}

function convertIdentExpression(
  node: SyntaxNode | null,
  context: SourceFile
): IdentifierExpression {
  if (!node) {
    throw new Error("Expected an identifier expression node");
  }

  return createNode(
    "IdentifierExpression",
    {
      ident: convertIdentifier(node.child(0), context),
    },
    node,
    context
  );
}

function convertStringExpression(
  node: SyntaxNode | null,
  context: SourceFile
): StringLiteralExpression {
  if (!node) {
    throw new Error("Expected a string literal expression node");
  }

  return createNode(
    "StringLiteralExpression",
    {
      value: node.text,
    },
    node,
    context
  );
}

function convertExpression(
  node: SyntaxNode | null,
  context: SourceFile
): Expression {
  if (!node) {
    throw new Error("Expected an expression node");
  }

  switch (node.type) {
    case "expression_call":
      return convertCallExpression(node, context);
    case "expression_tuple":
      return convertTupleExpression(node, context);
    case "expression_assign":
      return convertAssignmentExpression(node, context);
    case "expression_ident":
      return convertIdentExpression(node, context);
    case "expression_string":
      return convertStringExpression(node, context);
    case "expression":
    case "expression_plain":
      return convertExpression(node.child(0), context);
    default:
      throw new Error(`Unknown expression type: ${node.type}`);
  }
}
