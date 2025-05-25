import { None, Option, Some } from "ts-features";

import {
  CallExpression,
  Declaration,
  Expression,
  isAssignmentExpression,
  isCallExpression,
  isIdentifierExpression,
  isStringLiteralExpression,
  isTupleExpression,
  StringLiteralExpression,
} from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import { PySynthSettings } from ".";

function subExpression(
  expr: Expression,
  checker: TypeChecker,
  settings: PySynthSettings,
  dict: Map<CallExpression, string>,
  buffer: string[]
): string {
  const sub = (expr: Expression | string) =>
    typeof expr === "string"
      ? expr
      : subExpression(expr, checker, settings, dict, buffer);

  if (isCallExpression(expr)) {
    const { callee, args } = expr;
    if (callee.value === "Trainable") {
      const { value } = expr.args[0] as StringLiteralExpression;
      return `self.${value.replace(/["']/g, "")}`;
    }

    const right = [...buffer, ...args].map(sub);
    const flow = TypeChecker.getEdge(expr, checker).unwrap().callee.flow;

    if (flow.return) {
      return `${dict.get(expr)}(${right.join(", ")})`;
    }

    const operation = settings.operations.find(
      (op) => op.target === callee.value
    );

    if (!operation) {
      throw new Error(`Operation ${callee.value} not found in settings`);
    }

    if (operation.tensorOp) {
      const [first, ...rest] = right;

      return `${first}.${operation.opName}(${rest.join(", ")})`;
    } else {
      return `${callee.value}(${right.join(", ")})`;
    }
  }
  if (isAssignmentExpression(expr)) {
    const { left, right } = expr;

    return `${left.value} = ${sub(right)}`;
  }
  if (isIdentifierExpression(expr)) {
    return expr.ident.value;
  }
  if (isStringLiteralExpression(expr)) {
    throw new Error("Unreachable StringLiteralExpression as code");
  }
  if (isTupleExpression(expr)) {
    return `${expr.elements.map(sub).join(", ")}`;
  }

  throw new Error("Unreachable expression as code");
}

function expression(
  expr: Expression,
  checker: TypeChecker,
  settings: PySynthSettings,
  dict: Map<CallExpression, string>,
  buffer: string[]
): [Option<string>, string[]] {
  const sub = (expr: Expression) =>
    subExpression(expr, checker, settings, dict, buffer);

  if (isCallExpression(expr)) {
    return [Some(`y = ${sub(expr)}`), ["y"]];
  }
  if (isIdentifierExpression(expr)) {
    return [None(), [expr.ident.value]];
  }
  if (isAssignmentExpression(expr)) {
    const { left, right } = expr;

    return [Some(`${left.value} = ${sub(right)}`), [left.value]];
  }
  if (isStringLiteralExpression(expr)) {
    throw new Error("Unreachable StringLiteralExpression as code");
  }
  if (isTupleExpression(expr)) {
    const [first, ...rest] = expr.elements;

    if (isCallExpression(first)) {
      return [Some(`y = ${sub(first)}`), ["y", ...rest.map(sub)]];
    }

    if (isAssignmentExpression(first)) {
      const { left, right } = first;

      return [
        Some(`${left.value} = ${sub(right)}`),
        [left.value, ...rest.map(sub)],
      ];
    }

    return [None(), expr.elements.map(sub)];
  }

  throw new Error("Unreachable expression as code");
}

export function expressions(
  decl: Declaration,
  checker: TypeChecker,
  settings: PySynthSettings,
  dict: Map<CallExpression, string>,
  indent: number = 4
): string {
  const indentStr = " ".repeat(indent);

  let code = "";
  let buffer = decl.firstPipe
    ? decl.argumentList.args.map((arg) => arg.ident.value)
    : [];

  decl.exprs.forEach((expr) => {
    const [line, next] = expression(expr, checker, settings, dict, buffer);

    line.map((l) => (code += `${indentStr}${l}\n`));
    buffer = next;
  });

  code += `${indentStr}return ${buffer.join(", ")}\n`;

  return code;
}
