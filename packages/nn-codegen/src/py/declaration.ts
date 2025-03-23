import { Declaration } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";
import { PySynthSettings } from ".";
import { expressions } from "./expression";
import { inits } from "./init";

export function declaration(declaration: Declaration, checker: TypeChecker, settings: PySynthSettings): string {
  if (!declaration.exprs.length) return ""; // Declaration-only function, no need to generate code

  const name = declaration.name.value;
  const [init, dict] = inits(declaration, checker, settings);
   
  return `class ${name}:\n` +
`  def __init__(${initArguments(declaration)}):\n` +
    `${init}\n` +

`  def ${forwardCallName(settings)}(${forwardArguments(declaration)}) -> Tensor:\n` +
    `${expressions(declaration, checker, settings, dict)}\n`
}

function initArguments(declaration: Declaration) {
  return [
    "self",
    declaration.sizeDeclList 
      ? declaration.sizeDeclList.decls.map((arg) => {
        return `${arg.value}: int`
      })
      : []
  ]
  .join(", ");
}

function forwardArguments(declaration: Declaration) {
  return [
    "self",
    ...declaration.argumentList.args
      .map(arg => arg.ident.value)
      .map((arg) => `${arg}: Tensor`)
  ]
  .join(", ");

}

function forwardCallName(settings: PySynthSettings) {
  switch (settings.target) {
    case "tinygrad":
      return "__call__";
  }
}
