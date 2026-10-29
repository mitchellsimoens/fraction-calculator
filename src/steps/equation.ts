import { OPERATORS } from "../util/operators";
import type { Mixed, Step, StepId, Token } from "./types";

/** The equation part way through the working: values joined by operators. */
export interface Equation {
  readonly values: readonly Mixed[];
  readonly operators: readonly OPERATORS[];
}

/** The equation after a phase, plus the steps that phase showed (maybe none). */
export interface Phase {
  readonly equation: Equation;
  readonly steps: readonly Step[];
}

export interface StepExtras {
  readonly multipliers?: readonly (number | undefined)[];
  readonly wholes?: string;
  readonly divisor?: number;
  readonly highlights?: readonly boolean[];
}

const valueToken = (value: Mixed, multiplier?: number, highlight?: boolean): Token => ({
  kind: "value",
  value,
  ...(multiplier === undefined ? {} : { multiplier }),
  ...(highlight === true ? { highlight } : {}),
});

export const toTokens = (
  equation: Equation,
  multipliers: readonly (number | undefined)[] = [],
  highlights: readonly boolean[] = []
): Token[] =>
  equation.values.flatMap((value, index): Token[] => {
    const token = valueToken(value, multipliers[index], highlights[index]);

    return index === 0
      ? [token]
      : [{ kind: "operator", operator: equation.operators[index - 1] }, token];
  });

export const makeStep = (
  id: StepId,
  caption: string,
  equation: Equation,
  extras: StepExtras = {}
): Step => ({
  id,
  caption,
  tokens: toTokens(equation, extras.multipliers, extras.highlights),
  ...(extras.wholes === undefined ? {} : { wholes: extras.wholes }),
  ...(extras.divisor === undefined ? {} : { divisor: extras.divisor }),
});

/** Runs phases in order, each on the equation the previous one left. */
export const runPhases = (
  start: Equation,
  phases: readonly ((equation: Equation) => Phase)[]
): Phase =>
  phases.reduce<Phase>(
    (done, phase) => {
      const next = phase(done.equation);

      return { equation: next.equation, steps: [...done.steps, ...next.steps] };
    },
    { equation: start, steps: [] }
  );

/** How much a value is worth in units of its own denominator, ignoring sign. */
export const size = (m: Mixed): number => m.whole * m.denominator + m.numerator;

export const isAddOrSubtract = (operator: OPERATORS): boolean =>
  operator === OPERATORS.PLUS || operator === OPERATORS.MINUS;

/** A phase that shows nothing and leaves the equation as it is. */
export const none = (equation: Equation): Phase => ({ equation, steps: [] });
