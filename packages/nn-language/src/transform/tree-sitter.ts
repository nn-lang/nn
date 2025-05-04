import type { SyntaxNode, Tree } from "tree-sitter";

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
} from "../ast";
import { createNode } from "../node";
import { SourceFile } from "../index";

export namespace Transform.TreeSitter {
  namespace Util {
    export function fromSeperatedList(node: SyntaxNode): SyntaxNode[] {
      return [
        node.childForFieldName("item_first"),
        ...node.childrenForFieldName("item_remain"),
      ].filter((node) => node !== null);
    }
  }

  export function sourceFile(tree: Tree, context: SourceFile): Declaration[] {
    return tree.rootNode.children
      .filter((node) => node.type === "declaration")
      .map((node) => declaration(node, context));
  }

  function declaration(node: SyntaxNode, context: SourceFile): Declaration {
    return createNode(
      "Declaration",
      {
        name: identifier(node.childForFieldName("name"), context),
        sizeDeclList: sizeDeclarationList(
          node.childForFieldName("size_declaration_list"),
          context
        ),
        argumentList: argumentDeclarationList(
          node.childForFieldName("argument_declaration_list"),
          context
        ),
        returnType: node.childForFieldName("return_type")
          ? typeNode(node.childForFieldName("return_type"), context)
          : undefined,

        firstPipe: node.childForFieldName("first_pipe") !== null,
        exprs: node.childForFieldName("expressions")
          ? [
              node.childForFieldName("expression_first"),
              ...node.childrenForFieldName("expression_remain"),
            ].map((child) => expression(child, context))
          : [],

        commentLeading: node
          .childrenForFieldName("comment_leading")
          .filter((child) => child !== null)
          .map((child) => child.text.slice(1).trim()),
        commentTrailing: node
          .childrenForFieldName("comment_trailing")
          .filter((child) => child !== null)
          .map((child) => child.text.slice(1).trim()),
      },
      node,
      context
    );
  }

  function identifier(
    node: SyntaxNode | null,
    _context: SourceFile
  ): Identifier {
    if (!node) {
      throw new Error(`Expected an identifier node, got null`);
    }

    return createNode("Identifier", { value: node.text }, node, _context);
  }

  function sizeDeclarationList(
    node: SyntaxNode | null,
    context: SourceFile
  ): SizeDeclList {
    return node
      ? createNode(
          "SizeDeclList",
          {
            decls: Util.fromSeperatedList(node).map((item) =>
              identifier(item, context)
            ),
          },
          node,
          context
        )
      : createNode("SizeDeclList", { decls: [] }, null, context);
  }

  function argumentDeclarationList(
    node: SyntaxNode | null,
    context: SourceFile
  ): ArgumentList {
    return node
      ? createNode(
          "ArgumentList",
          {
            args: Util.fromSeperatedList(node).map((child) => ({
              ident: identifier(child.child(0), context),
              valueType: typeNode(child.child(2), context),
            })),
          },
          node,
          context
        )
      : createNode("ArgumentList", { args: [] }, null, context);
  }

  function typeNode(node: SyntaxNode | null, context: SourceFile): TypeNode {
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
              .namedChildren.map((child) => sizeNode(child, context))
          : [],
      },
      node,
      context
    );
  }

  function sizeNode(node: SyntaxNode | null, context: SourceFile): SizeNode {
    if (!node) {
      throw new Error("Expected a size node");
    }

    switch (node.type) {
      case "size":
      case "size_operation":
        return sizeNode(node.child(0), context);
      case "size_pow":
        return createNode<ArithmeticSizeNode>(
          "ArithmeticSizeNode",
          {
            left: sizeNode(node.child(0), context),
            right: sizeNode(node.child(2), context),
            sizeType: "pow",
          },
          node,
          context
        );
      case "size_mul":
        return createNode<ArithmeticSizeNode>(
          "ArithmeticSizeNode",
          {
            left: sizeNode(node.child(0), context),
            right: sizeNode(node.child(2), context),
            sizeType: "mul",
          },
          node,
          context
        );
      case "size_div":
        return createNode<ArithmeticSizeNode>(
          "ArithmeticSizeNode",
          {
            left: sizeNode(node.child(0), context),
            right: sizeNode(node.child(2), context),
            sizeType: "div",
          },
          node,
          context
        );
      case "size_add":
        return createNode<ArithmeticSizeNode>(
          "ArithmeticSizeNode",
          {
            left: sizeNode(node.child(0), context),
            right: sizeNode(node.child(2), context),
            sizeType: "add",
          },
          node,
          context
        );
      case "size_sub":
        return createNode<ArithmeticSizeNode>(
          "ArithmeticSizeNode",
          {
            left: sizeNode(node.child(0), context),
            right: sizeNode(node.child(2), context),
            sizeType: "sub",
          },
          node,
          context
        );
      case "size_ident":
        return createNode<IdentifierSizeNode>(
          "IdentifierSizeNode",
          {
            ident: identifier(node.child(0), context),
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
        return sizeNode(node.child(1), context);
    }

    throw new Error(`Unknown size node type: ${node.type}`);
  }

  function callExpression(
    node: SyntaxNode | null,
    context: SourceFile
  ): CallExpression {
    if (!node) {
      throw new Error("Expected a call expression node");
    }

    return createNode(
      "CallExpression",
      {
        callee: identifier(node.childForFieldName("callee"), context),
        sizes:
          node
            .childForFieldName("sizes")
            ?.namedChildren.map((child) => sizeNode(child, context)) || [],
        args: node.childForFieldName("arguments")
          ? Util.fromSeperatedList(node.childForFieldName("arguments")!)
            .map((node) => expression(node, context))
          : [],
      },
      node,
      context
    );
  }

  function tupleExpression(
    node: SyntaxNode | null,
    context: SourceFile
  ): TupleExpression {
    if (!node) {
      throw new Error("Expected a tuple expression node");
    }

    return createNode(
      "TupleExpression",
      {
        elements: node.namedChildren.map((child) => expression(child, context)),
      },
      node,
      context
    );
  }

  function assignmentExpression(
    node: SyntaxNode | null,
    context: SourceFile
  ): AssignmentExpression {
    if (!node) {
      throw new Error("Expected an assignment expression node");
    }

    return createNode(
      "AssignmentExpression",
      {
        left: identifier(node.child(0), context),
        right: expression(node.child(2), context),
      },
      node,
      context
    );
  }

  function identExpression(
    node: SyntaxNode | null,
    context: SourceFile
  ): IdentifierExpression {
    if (!node) {
      throw new Error("Expected an identifier expression node");
    }

    return createNode(
      "IdentifierExpression",
      {
        ident: identifier(node.child(0), context),
      },
      node,
      context
    );
  }

  function stringExpression(
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

  function expression(
    node: SyntaxNode | null,
    context: SourceFile
  ): Expression {
    if (!node) {
      throw new Error("Expected an expression node");
    }

    switch (node.type) {
      case "expression_call":
        return callExpression(node, context);
      case "expression_tuple":
        return tupleExpression(node, context);
      case "expression_assign":
        return assignmentExpression(node, context);
      case "expression_ident":
        return identExpression(node, context);
      case "expression_string":
        return stringExpression(node, context);
      case "expression":
      case "expression_plain":
        return expression(node.child(0), context);
      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }
}
