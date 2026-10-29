import { gcd, lcm } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { type Equation, makeStep, none, type Phase, runPhases, size } from "./equation";
import { formatMixed } from "./mixed";
import { carryIfNeeded, workFirstPair } from "./pair";
import type { Mixed, Step } from "./types";

const flip = (operator: OPERATORS): OPERATORS =>
  operator === OPERATORS.MINUS ? OPERATORS.PLUS : OPERATORS.MINUS;

/** `5 − −2` becomes `5 + 2`: fold each later negative into its operator. */
const foldSigns = (equation: Equation): Phase => {
  const [first, ...rest] = equation.values;

  if (!rest.some((value) => value.negative)) {
    return none(equation);
  }

  const folded: Equation = {
    values: [first, ...rest.map((value) => ({ ...value, negative: false }))],
    operators: equation.operators.map((operator, index) =>
      rest[index].negative ? flip(operator) : operator
    ),
  };
  const caption = "Taking away a negative is adding, and adding a negative is taking away.";

  return { equation: folded, steps: [makeStep("signs", caption, folded)] };
};

/** Fractions typed bigger than a whole (`1 5/4`) are carried first. */
const carryTypedTerms = (equation: Equation): Phase =>
  runPhases(
    equation,
    equation.values.map((_, index) => (current: Equation) => carryIfNeeded(current, index))
  );

const hasFraction = (value: Mixed): boolean => value.numerator !== 0;

const rewriteOver = (value: Mixed, denominator: number): Mixed => ({
  ...value,
  numerator: value.numerator * (denominator / value.denominator),
  denominator,
});

/** Puts every fraction over the least common denominator. */
const commonDenominator = (equation: Equation): Phase => {
  const fractions = equation.values.filter(hasFraction);
  const denominator = fractions.reduce((acc, value) => lcm(acc, value.denominator), 1);
  const after: Equation = {
    ...equation,
    values: equation.values.map((value) =>
      hasFraction(value) ? rewriteOver(value, denominator) : { ...value, numerator: 0, denominator }
    ),
  };

  if (fractions.every((value) => value.denominator === denominator)) {
    // whole numbers quietly take the shared denominator; nothing to show
    return none(after);
  }

  const multipliers = equation.values.map((value) =>
    hasFraction(value) && value.denominator !== denominator ? denominator / value.denominator : undefined
  );
  const caption = `Make the bottom numbers the same: ${denominator} is the smallest one they all go into.`;

  return { equation: after, steps: [makeStep("common-denominator", caption, after, { multipliers })] };
};

/** Works left to right, one pair at a time, until one value is left. */
const workPairs = (equation: Equation): Phase =>
  equation.values.length < 2
    ? none(equation)
    : runPhases(equation, [workFirstPair, workPairs]);

const simplify = (equation: Equation): Phase => {
  const [value] = equation.values;

  if (value.numerator === 0) {
    const whole = { ...value, denominator: 1 };
    const after = { ...equation, values: [whole] };

    return { equation: after, steps: [makeStep("simplify", `The answer is ${formatMixed(whole)}.`, after)] };
  }

  const divisor = gcd(value.numerator, value.denominator);

  if (divisor === 1) {
    const caption = `${formatMixed(value)} is already as simple as it can be.`;

    return { equation, steps: [makeStep("simplify", caption, equation)] };
  }

  const reduced = { ...value, numerator: value.numerator / divisor, denominator: value.denominator / divisor };
  const after = { ...equation, values: [reduced] };
  const caption = `Divide the top and bottom by ${divisor}: ${formatMixed(reduced)}.`;

  return { equation: after, steps: [makeStep("simplify", caption, after, { divisor })] };
};

// the lcm only grows, so a safe shared denominator means every lcm and
// multiplier on the way was exact; every other number in the working stays
// below the sum of all the sizes
const isExact = (equation: Equation): boolean =>
  Number.isSafeInteger(equation.values[0].denominator) &&
  Number.isSafeInteger(equation.values.reduce((acc, value) => acc + size(value), 0));

/**
 * The classroom steps for an equation of only `+` and `−`.
 * Returns [] when the numbers are too large to work exactly.
 */
export const addSubtractSteps = (
  values: readonly Mixed[],
  operators: readonly OPERATORS[]
): Step[] => {
  const prepared = runPhases({ values, operators }, [foldSigns, carryTypedTerms, commonDenominator]);

  if (!isExact(prepared.equation)) {
    return [];
  }

  const worked = runPhases(prepared.equation, [workPairs, simplify]);

  return [...prepared.steps, ...worked.steps];
};
