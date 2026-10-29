import { type Fraction, isSafeFraction } from "../util/fraction";
import { toFractions } from "./editing";
import { evaluate } from "./evaluate";
import type { Draft } from "./types";

export { isSafeFraction };

export type CalcError = "divide-by-zero" | "too-large";

export type Solved =
  | { readonly answer: Fraction; readonly error: null }
  | { readonly answer: null; readonly error: CalcError };

const failed = (error: CalcError): Solved => ({ answer: null, error });

/**
 * What `=` shows for a draft, or null when the draft is unfinished and
 * `=` should do nothing. Never answers with a rounded or broken number.
 */
export function solveDraft(draft: Draft): Solved | null {
  const parsed = toFractions(draft);

  if ("reason" in parsed) {
    switch (parsed.reason) {
      case "too-large":
        return failed("too-large");
      case "zero-denominator":
        return failed("divide-by-zero");
      default:
        return null;
    }
  }

  const result = evaluate(parsed.values, draft.operators);

  if ("reason" in result) {
    return failed(result.reason);
  }

  return isSafeFraction(result.value) ? { answer: result.value, error: null } : failed("too-large");
}
