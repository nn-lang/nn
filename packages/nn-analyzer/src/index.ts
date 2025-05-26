import { Result, err, ok } from "ts-features";

import { isCallExpression, travel } from "@nn-lang/nn-language";
import { Flow, Polynomial, TypeChecker } from "@nn-lang/nn-type-checker";

export interface AnalyzerTarget {
  source: string;
  flow: string;
}

export interface AnalyzerSettings {
  sizeMap: Record<string, number>;
}

export function analyze(
  checker: TypeChecker,
  target: AnalyzerTarget,
  settings: AnalyzerSettings,
): Result<string, string> {
  const file = checker.scope.files[target.source];
  if (!file) return err(`File ${target.source} not in workspace`);

  const flow = file.flows[target.flow];
  if (!flow) return err(`Flow ${target.flow} not in the file ${target.source}`);

  const polynomial = getPolynomialForFlow(checker, flow, settings);
  return ok(Polynomial.inspect(polynomial));
}

function getPolynomialForFlow(
  checker: TypeChecker,
  flow: Flow,
  _settings: AnalyzerSettings,
) {
  const calls = travel(flow.declaration.node, isCallExpression);

  const result = calls.reduce((prev, call) => {
    const calleeName = call.callee.value;

    if (calleeName === "Trainable") {
      const type = TypeChecker.getType(call, checker).unwrap();

      const product = type.shape.reduce(
        (prev, curr) => Polynomial.mul(prev, Polynomial.from(curr)),
        Polynomial.constant(1),
      );

      return Polynomial.add(prev, product);
    }

    return prev;
  }, Polynomial.constant(0));

  return result;
}
