import { OPERATORS } from "./operators";
import { splitValue } from "./regex";

/**
 * A fraction with an integer numerator and a positive integer denominator.
 * The sign lives on the numerator and the fraction is always fully reduced.
 */
export interface Fraction {
  readonly numerator: number;
  readonly denominator: number;
}

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    [x, y] = [y, x % y];
  }

  return x;
};

const create = (numerator: number, denominator: number): Fraction => {
  const divisor = gcd(numerator, denominator) || 1;
  const sign = denominator < 0 ? -1 : 1;

  return {
    numerator: (sign * numerator) / divisor,
    denominator: (sign * denominator) / divisor,
  };
};

/**
 * Parses calculator input such as "2", "1/2" or "2 1/2" into a fraction.
 * Returns null when the denominator is zero.
 */
export const parseFraction = (
  value: string,
  negative = false
): Fraction | null => {
  // splitValue reads a bare "3/4" as whole "3", so handle it here;
  // typed input carries a leading space (" 3/4") but results do not
  const [, whole, numerator, denominator] = /^\d+\/\d+$/.test(value.trim())
    ? ["", "", ...value.trim().split("/")]
    : splitValue(value);
  const wholeNumber = Number(whole || 0);

  if (!numerator || !denominator) {
    return create(negative ? -wholeNumber : wholeNumber, 1);
  }

  if (Number(denominator) === 0) {
    return null;
  }

  const improper = wholeNumber * Number(denominator) + Number(numerator);

  return create(negative ? -improper : improper, Number(denominator));
};

/**
 * Applies the operator exactly. Returns null for division by zero.
 */
export const calculate = (
  left: Fraction,
  operator: OPERATORS,
  right: Fraction
): Fraction | null => {
  switch (operator) {
    case OPERATORS.PLUS:
      return create(
        left.numerator * right.denominator + right.numerator * left.denominator,
        left.denominator * right.denominator
      );

    case OPERATORS.MINUS:
      return create(
        left.numerator * right.denominator - right.numerator * left.denominator,
        left.denominator * right.denominator
      );

    case OPERATORS.MULTIPLY:
      return create(
        left.numerator * right.numerator,
        left.denominator * right.denominator
      );

    case OPERATORS.DIVIDE:
      if (right.numerator === 0) {
        return null;
      }

      return create(
        left.numerator * right.denominator,
        left.denominator * right.numerator
      );

    default:
      return null;
  }
};

/**
 * Formats as a mixed number ("2 1/2"). The sign is returned separately
 * because the calculator state keeps it in its own `negative` flag.
 */
export const formatFraction = (
  fraction: Fraction
): { text: string; negative: boolean } => {
  const negative = fraction.numerator < 0;
  const numerator = Math.abs(fraction.numerator);
  const whole = Math.floor(numerator / fraction.denominator);
  const remainder = numerator % fraction.denominator;

  if (!remainder) {
    return { text: String(whole), negative };
  }

  const part = `${remainder}/${fraction.denominator}`;

  return { text: whole ? `${whole} ${part}` : part, negative };
};
