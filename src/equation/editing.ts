import { Fraction, formatFraction, isSafeFraction, parseFraction } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { splitValue } from "../util/regex";
import type { Draft, Part, Term } from "./types";

export type ToFractionsFailure =
  | "incomplete"
  | "invalid"
  | "zero-denominator"
  | "too-large";

export type ToFractionsResult =
  | { readonly ok: true; readonly values: Fraction[] }
  | { readonly ok: false; readonly reason: ToFractionsFailure };

/** Longest number a child can type into one part (whole, top or bottom). */
export const MAX_PART_DIGITS = 6;

const emptyTerm: Term = { text: "", negative: false };

export const emptyDraft: Draft = { terms: [emptyTerm], operators: [] };

export function currentTerm(draft: Draft): Term {
  return draft.terms[draft.terms.length - 1];
}

// index into the array returned by splitValue
const PART_INDEX: Record<Part, number> = {
  whole: 1,
  numerator: 2,
  denominator: 3,
};

// "7 1/4", " 1/4" (no whole) or "3"
const joinParts = (values: string[]): string => {
  const fraction = values[2] || values[3] ? ` ${values[2]}/${values[3]}` : "";

  return `${values[1]}${fraction}`;
};

const withCurrentTerm = (draft: Draft, term: Term): Draft => ({
  ...draft,
  terms: [...draft.terms.slice(0, -1), term],
});

const editPart = (
  draft: Draft,
  part: Part,
  edit: (current: string) => string
): Draft => {
  const term = currentTerm(draft);
  const values = splitValue(term.text);
  const index = PART_INDEX[part];

  values[index] = edit(values[index]);

  return withCurrentTerm(draft, { ...term, text: joinParts(values) });
};

export function typeInto(draft: Draft, part: Part, digit: string): Draft {
  const current = splitValue(currentTerm(draft).text)[PART_INDEX[part]];

  if (current.length >= MAX_PART_DIGITS) {
    return draft;
  }

  return editPart(draft, part, (typed) => typed + digit);
}

export function deleteFrom(draft: Draft, part: Part): Draft {
  if (currentTerm(draft).text === "" && draft.operators.length > 0) {
    return {
      terms: draft.terms.slice(0, -1),
      operators: draft.operators.slice(0, -1),
    };
  }

  return editPart(draft, part, (current) => current.slice(0, -1));
}

export function pressOperator(draft: Draft, operator: OPERATORS): Draft {
  if (currentTerm(draft).text === "") {
    if (draft.operators.length === 0) {
      return draft;
    }

    return {
      ...draft,
      operators: [...draft.operators.slice(0, -1), operator],
    };
  }

  return {
    terms: [...draft.terms, emptyTerm],
    operators: [...draft.operators, operator],
  };
}

export function toggleSign(draft: Draft): Draft {
  const term = currentTerm(draft);

  return withCurrentTerm(draft, { ...term, negative: !term.negative });
}

/**
 * An answer written in the typed format, so it reads back part by part.
 * Never holds "Infinity", "NaN" or exponent text: those give an empty term.
 */
export function answerTerm(answer: Fraction): Term {
  if (!isSafeFraction(answer)) {
    return emptyTerm;
  }

  const { text, negative } = formatFraction(answer);
  // a bare fraction has no whole part, which the typed format marks with a space
  const typed = text.includes("/") && !text.includes(" ") ? ` ${text}` : text;

  return { text: typed, negative };
}

export function carryForward(answer: Fraction): Draft {
  const term = answerTerm(answer);

  return term.text === "" ? emptyDraft : { terms: [term], operators: [] };
}

// whole numbers have no fraction part; read it as over 1
const termParts = (text: string): readonly string[] => {
  const [, whole, numerator, denominator] = splitValue(text);

  return [whole, numerator, denominator];
};

const checkTerm = (term: Term): ToFractionsFailure | null => {
  const [whole, numerator, denominator] = termParts(term.text);

  // empty term, or a fraction with only one of its two parts
  if (!whole && !numerator && !denominator) {
    return "incomplete";
  }
  if (Boolean(numerator) !== Boolean(denominator)) {
    return "incomplete";
  }

  const [w, n, d] = [whole || "0", numerator || "0", denominator || "1"].map(Number);

  // Number() silently rounds long digit strings, so never trust them
  if (![w, n, d, w * d + n].every(Number.isSafeInteger)) {
    return "too-large";
  }

  return d === 0 ? "zero-denominator" : null;
};

export function toFractions(draft: Draft): ToFractionsResult {
  const values: Fraction[] = [];

  for (const term of draft.terms) {
    const failure = checkTerm(term);

    if (failure !== null) {
      return { ok: false, reason: failure };
    }

    const fraction = parseFraction(term.text, term.negative);

    if (fraction == null) {
      return { ok: false, reason: "invalid" };
    }

    values.push(fraction);
  }

  return { ok: true, values };
}
