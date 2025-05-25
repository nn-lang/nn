import { Node } from "./node"

export interface SizeDeclList extends Node {
  decls: Identifier[]

  type: "SizeDeclList"
}

export interface ArgumentList extends Node {
  args: { ident: Identifier, valueType: TypeNode }[]

  type: "ArgumentList"
}

export interface Identifier extends Node {
  value: string

  type: "Identifier"
}

export interface Import extends Node {
  idents: Identifier[],
  target: string
  
  type: "Import"
}

export interface Declaration extends Node {
  name: Identifier
  sizeDeclList: SizeDeclList
  argumentList: ArgumentList

  firstPipe: boolean
  exprs: Expression[]
  
  returnType?: TypeNode

  commentLeading: string[],
  commentTrailing: string[],
  type: "Declaration"
}

export interface CallExpression extends Node {
  callee: Identifier
  sizes?: SizeNode[]
  args: Expression[]

  type: "CallExpression"
}

export interface TupleExpression extends Node {
  elements: Expression[]

  type: "TupleExpression"
}

export interface AssignmentExpression extends Node {
  left: Identifier
  right: Expression

  type: "AssignmentExpression"
}

export interface IdentifierExpression extends Node {
  ident: Identifier

  type: "IdentifierExpression"
}

export interface StringLiteralExpression extends Node {
  value: string

  type: "StringLiteralExpression"
}

export type Expression =
  | CallExpression
  | TupleExpression
  | AssignmentExpression
  | IdentifierExpression
  | StringLiteralExpression

export interface ArithmeticSizeNode extends Node {
  left: SizeNode
  right: SizeNode

  sizeType: "pow" | "mul" | "div" | "add" | "sub"
  type: "ArithmeticSizeNode"
}

export interface IdentifierSizeNode extends Node {
  ident: Identifier

  sizeType: "ident"
  type: "IdentifierSizeNode"
}

export interface NumberSizeNode extends Node {
  number: number

  sizeType: "number"
  type: "NumberSizeNode"
}

export type SizeNode =
  | ArithmeticSizeNode
  | IdentifierSizeNode
  | NumberSizeNode

export interface TypeNode extends Node {
  isTensor: boolean // true
  sizes?: SizeNode[]

  type: "TypeNode"
}
