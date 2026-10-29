import type { Term } from "../equation/types";
import { gcd, type Fraction } from "../util/fraction";
import type { Mixed } from "./types";

export const MINUS_SIGN = "−";

// "2", "3/4" or "7 1/4" (a typed term may carry surrounding spaces)
const TERM_PATTERN = /^(?:(\d+)|(\d+)\/(\d+)|(\d+)\s+(\d+)\/(\d+))$/;

const parts = (match: RegExpExecArray): readonly string[] => {
  if (match[1] !== undefined) {
    return [match[1], "0", "1"];
  }

  if (match[2] !== undefined) {
    return ["0", match[2], match[3]];
  }

  return [match[4], match[5], match[6]];
};

/**
 * Reads a term as typed. Returns null when it is empty, incomplete,
 * has a zero denominator or is too large to be exact.
 */
export const toMixed = (term: Term): Mixed | null => {
  const match = TERM_PATTERN.exec(term.text.trim());

  if (!match) {
    return null;
  }

  const [whole, numerator, denominator] = parts(match).map(Number);
  const safe = [whole, numerator, denominator].every(Number.isSafeInteger);

  if (!safe || denominator === 0) {
    return null;
  }

  const isZero = whole === 0 && numerator === 0;

  return { negative: term.negative && !isZero, whole, numerator, denominator };
};

/** The exact signed value, fully reduced. */
export const mixedToFraction = (m: Mixed): Fraction => {
  const size = m.whole * m.denominator + m.numerator;
  const divisor = gcd(size, m.denominator) || 1;
  const numerator = size / divisor;

  return {
    numerator: m.negative && numerator !== 0 ? -numerator : numerator,
    denominator: m.denominator / divisor,
  };
};

/** Plain text for captions: "7 1/4", "−3/4", "2". */
export const formatMixed = (m: Mixed): string => {
  const sign = m.negative ? MINUS_SIGN : "";
  const fraction = `${m.numerator}/${m.denominator}`;

  if (m.numerator === 0) {
    return `${sign}${m.whole}`;
  }

  return m.whole === 0 ? `${sign}${fraction}` : `${sign}${m.whole} ${fraction}`;
};
