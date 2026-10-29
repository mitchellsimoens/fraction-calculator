import type { Fraction } from "../util/fraction";
import { mixedToFraction } from "./mixed";
import type { Mixed, Step } from "./types";

const isCount = (n: number): boolean => Number.isSafeInteger(n) && n >= 0 && !Object.is(n, -0);

const isExactValue = (value: Mixed): boolean =>
  isCount(value.whole) && isCount(value.numerator) && isCount(value.denominator) && value.denominator > 0;

const stepValues = (step: Step): readonly Mixed[] =>
  step.tokens.flatMap((token) => (token.kind === "value" ? [token.value] : []));

/**
 * A last safety net before steps reach the screen: every number shown is an
 * exact whole number and the final step holds exactly the answer `=` gives.
 */
export const isSound = (steps: readonly Step[], answer: Fraction): boolean => {
  if (steps.length === 0 || !steps.every((step) => stepValues(step).every(isExactValue))) {
    return false;
  }

  const final = steps[steps.length - 1].tokens;

  if (final.length !== 1 || final[0].kind !== "value") {
    return false;
  }

  const shown = mixedToFraction(final[0].value);

  return shown.numerator === answer.numerator && shown.denominator === answer.denominator;
};
