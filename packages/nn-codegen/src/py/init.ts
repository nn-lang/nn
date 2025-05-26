import { PySynthSettings } from ".";

import {
  CallExpression,
  Declaration,
  StringLiteralExpression,
  isCallExpression,
  travel,
} from "@nn-lang/nn-language";
import { SizeType, TypeChecker } from "@nn-lang/nn-type-checker";

export function inits(
  declaration: Declaration,
  checker: TypeChecker,
  settings: PySynthSettings,
  indent: number = 4,
): [string, Map<CallExpression, string>] {
  let code = "";
  const indentStr = " ".repeat(indent);

  const calls = travel(declaration, isCallExpression);
  const callDict = new Map<CallExpression, string>();

  calls.forEach((call, i) => {
    if (call.callee.value === "Trainable") {
      const { value } = call.args[0] as StringLiteralExpression;
      const type = TypeChecker.getType(call, checker).unwrap();

      callDict.set(call, `self.${value.replace(/"/g, "")}`);
      code += `${indentStr}${callDict.get(call)} = Tensor.zeros(${type.shape.map(SizeType.toString).join(", ")}\n`;
    } else if (
      !settings.operations.find((op) => op.target === call.callee.value)
    ) {
      const member = `self.${call.callee.value}_${i}`;
      callDict.set(call, member);

      const edge = TypeChecker.getEdge(call, checker).unwrap();
      code += `${indentStr}${member} = ${call.callee.value}(${edge.sizeArgs.map(SizeType.toString).join(", ")})\n`;
    }
  });

  if (code.trim() === "") {
    return [`${indentStr}pass\n`, callDict];
  }

  return [code, callDict];
}
