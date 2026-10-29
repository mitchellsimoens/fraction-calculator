import { calculate, type Fraction } from "../util/fraction";
import { OPERATORS } from "../util/operators";

export type EvalResult =
  | { readonly ok: true; readonly value: Fraction }
  | { readonly ok: false; readonly reason: "divide-by-zero" | "too-large" };

type Failure = Extract<EvalResult, { ok: false }>["reason"];

const isHigherPrecedence = (operator: OPERATORS): boolean =>
  operator === OPERATORS.MULTIPLY || operator === OPERATORS.DIVIDE;

/** Every intermediate product `calculate` will form for this operation. */
const products = (
  left: Fraction,
  operator: OPERATORS,
  right: Fraction
): readonly number[] => {
  switch (operator) {
    case OPERATORS.PLUS:
      return [
        left.numerator * right.denominator,
        right.numerator * left.denominator,
        left.denominator * right.denominator,
        left.numerator * right.denominator + right.numerator * left.denominator,
      ];

    case OPERATORS.MINUS:
      return [
        left.numerator * right.denominator,
        right.numerator * left.denominator,
        left.denominator * right.denominator,
        left.numerator * right.denominator - right.numerator * left.denominator,
      ];

    case OPERATORS.MULTIPLY:
      return [
        left.numerator * right.numerator,
        left.denominator * right.denominator,
      ];

    default:
      return [
        left.numerator * right.denominator,
        left.denominator * right.numerator,
      ];
  }
};

const apply = (
  left: Fraction,
  operator: OPERATORS,
  right: Fraction
): Fraction | Failure => {
  if (operator === OPERATORS.DIVIDE && right.numerator === 0) {
    return "divide-by-zero";
  }

  if (!products(left, operator, right).every(Number.isSafeInteger)) {
    return "too-large";
  }

  return calculate(left, operator, right) ?? "divide-by-zero";
};

/**
 * Evaluates with multiplication and division before addition and
 * subtraction, each left to right. Exact; reports failure instead of
 * losing precision.
 */
export const evaluate = (
  values: readonly Fraction[],
  operators: readonly OPERATORS[]
): EvalResult => {
  // pass 1: collapse x / ÷ runs into single terms
  let terms: readonly Fraction[] = [values[0]];
  let lowOperators: readonly OPERATORS[] = [];

  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const next = values[i + 1];

    if (isHigherPrecedence(operator)) {
      const result = apply(terms[terms.length - 1], operator, next);

      if (typeof result === "string") {
        return { ok: false, reason: result };
      }

      terms = [...terms.slice(0, -1), result];
    } else {
      terms = [...terms, next];
      lowOperators = [...lowOperators, operator];
    }
  }

  // pass 2: + / − left to right
  let total = terms[0];

  for (let i = 0; i < lowOperators.length; i++) {
    const result = apply(total, lowOperators[i], terms[i + 1]);

    if (typeof result === "string") {
      return { ok: false, reason: result };
    }

    total = result;
  }

  return { ok: true, value: total };
};
