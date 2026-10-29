import { evaluate } from "../equation/evaluate";
import type { Term } from "../equation/types";
import type { OPERATORS } from "../util/operators";
import { addSubtractSteps } from "./addSubtract";
import { isAddOrSubtract } from "./equation";
import { mixedToFraction, toMixed } from "./mixed";
import { multiplyDivideSteps } from "./multiplyDivide";
import type { Mixed, Step } from "./types";
import { isSound } from "./verify";

/**
 * The step-by-step working for an equation, as data for the steps view.
 * Returns [] when there is a single term or the equation cannot be worked
 * (an invalid term, dividing by zero, or numbers too large to be exact).
 */
export function explain(
  terms: readonly Term[],
  operators: readonly OPERATORS[]
): Step[] {
  if (terms.length < 2 || operators.length !== terms.length - 1) {
    return [];
  }

  const values = terms.map(toMixed).filter((value): value is Mixed => value !== null);

  if (values.length !== terms.length) {
    return [];
  }

  // the answer `=` shows; the steps must end on exactly this
  const result = evaluate(values.map(mixedToFraction), operators);

  if (!result.ok) {
    return [];
  }

  const steps = operators.every(isAddOrSubtract)
    ? addSubtractSteps(values, operators)
    : multiplyDivideSteps(values, operators);

  return isSound(steps, result.value) ? steps : [];
}
