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
import { Node } from "./node";

export function isDeclaration(node: Node): node is Declaration {
  return node.type === "Declaration";
}

export function isSizeDeclList(node: Node): node is SizeDeclList {
  return node.type === "SizeDeclList";
}

export function isArgumentList(node: Node): node is ArgumentList {
  return node.type === "ArgumentList";
}

export function isExpression(node: Node): node is Expression {
  return (
    node.type === "IdentifierExpression" ||
    node.type === "CallExpression" ||
    node.type === "AssignmentExpression" ||
    node.type === "TupleExpression" ||
    node.type === "StringLiteralExpression"
  );
}

export function isIdentifierExpression(
  node: Node,
): node is IdentifierExpression {
  return node.type === "IdentifierExpression";
}

export function isCallExpression(node: Node): node is CallExpression {
  return node.type === "CallExpression";
}

export function isTupleExpression(node: Node): node is TupleExpression {
  return node.type === "TupleExpression";
}

export function isAssignmentExpression(
  node: Node,
): node is AssignmentExpression {
  return node.type === "AssignmentExpression";
}

export function isStringLiteralExpression(
  node: Node,
): node is StringLiteralExpression {
  return node.type === "StringLiteralExpression";
}

export function isIdentifier(node: Node): node is Identifier {
  return node.type === "Identifier";
}

export function isTypeNode(node: Node): node is TypeNode {
  return node.type === "TypeNode";
}

export function isSizeNode(node: Node): node is SizeNode {
  return (
    isArithmeticSizeNode(node) ||
    isIdentifierSizeNode(node) ||
    isNumberSizeNode(node)
  );
}

export function isArithmeticSizeNode(node: Node): node is ArithmeticSizeNode {
  return node.type === "ArithmeticSizeNode";
}

export function isIdentifierSizeNode(node: Node): node is IdentifierSizeNode {
  return node.type === "IdentifierSizeNode";
}

export function isNumberSizeNode(node: Node): node is NumberSizeNode {
  return node.type === "NumberSizeNode";
}
