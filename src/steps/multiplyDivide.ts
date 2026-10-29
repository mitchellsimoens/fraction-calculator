import { gcd } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { addSubtractSteps } from "./addSubtract";
import { type Equation, isAddOrSubtract, makeStep, none, type Phase, runPhases, size } from "./equation";
import { formatMixed } from "./mixed";
import type { Mixed, Step } from "./types";

/*
 * × and ÷ go first. Each run of values joined by × or ÷ (a "group") is worked
 * with improper fractions: improper (if a mixed number is in it), reciprocal
 * (if it has a ÷), multiply, then simplify (only when something reduces).
 * The + and − steps then run on what is left.
 */

/** Value indexes `start` to `end` (inclusive) joined only by × or ÷. */
interface Group {
  readonly start: number;
  readonly end: number;
}

const isMultiplyOrDivide = (operator: OPERATORS): boolean => !isAddOrSubtract(operator);

const isMixedNumber = (value: Mixed): boolean => value.whole > 0 && value.numerator > 0;

const ZERO: Mixed = { negative: false, whole: 0, numerator: 0, denominator: 1 };

const firstGroup = (equation: Equation): Group | null => {
  const start = equation.operators.findIndex(isMultiplyOrDivide);

  if (start < 0) {
    return null;
  }

  const next = equation.operators.findIndex((operator, index) => index > start && isAddOrSubtract(operator));

  return { start, end: next < 0 ? equation.operators.length : next };
};

const groupValues = (equation: Equation, group: Group): readonly Mixed[] =>
  equation.values.slice(group.start, group.end + 1);

const groupOperators = (equation: Equation, group: Group): readonly OPERATORS[] =>
  equation.operators.slice(group.start, group.end);

const replaceGroup = (
  equation: Equation,
  group: Group,
  values: readonly Mixed[],
  operators: readonly OPERATORS[]
): Equation => ({
  values: [...equation.values.slice(0, group.start), ...values, ...equation.values.slice(group.end + 1)],
  operators: [...equation.operators.slice(0, group.start), ...operators, ...equation.operators.slice(group.end)],
});

const replaceAt = (equation: Equation, index: number, value: Mixed): Equation => ({
  ...equation,
  values: equation.values.map((old, at) => (at === index ? value : old)),
});

/** When × and ÷ meet + and −, say which part goes first. */
const order = (equation: Equation): Phase => {
  const { operators } = equation;

  if (operators.every(isAddOrSubtract) || operators.every(isMultiplyOrDivide)) {
    return none(equation);
  }

  const highlights = equation.values.map((_, index) =>
    [operators[index - 1], operators[index]].some((operator) => operator !== undefined && isMultiplyOrDivide(operator))
  );
  const caption = "Do × and ÷ first, then + and −.";

  return { equation, steps: [makeStep("order", caption, equation, { highlights })] };
};

const toImproper = (value: Mixed): Mixed =>
  isMixedNumber(value) ? { ...value, whole: 0, numerator: size(value) } : value;

const improper = (group: Group) => (equation: Equation): Phase => {
  const values = groupValues(equation, group);
  const first = values.find(isMixedNumber);

  if (first === undefined) {
    return none(equation);
  }

  const after = replaceGroup(equation, group, values.map(toImproper), groupOperators(equation, group));
  const caption = `Turn mixed numbers into improper fractions: ${formatMixed(first)} becomes ${formatMixed(toImproper(first))}.`;

  return { equation: after, steps: [makeStep("improper", caption, after)] };
};

const flip = (value: Mixed): Mixed => ({
  negative: value.negative,
  whole: 0,
  numerator: value.denominator,
  denominator: size(value),
});

const reciprocal = (group: Group) => (equation: Equation): Phase => {
  const operators = groupOperators(equation, group);

  if (!operators.includes(OPERATORS.DIVIDE)) {
    return none(equation);
  }

  const values = groupValues(equation, group).map((value, index) =>
    index > 0 && operators[index - 1] === OPERATORS.DIVIDE ? flip(value) : value
  );
  const after = replaceGroup(equation, group, values, operators.map(() => OPERATORS.MULTIPLY));
  const caption = "To divide, turn the fraction after ÷ upside down and multiply instead.";

  return { equation: after, steps: [makeStep("reciprocal", caption, after)] };
};

/** n/1 is shown as the whole number n, so it never needs a carry step. */
const asWholeIfOverOne = (value: Mixed): Mixed =>
  value.denominator === 1 ? { ...value, whole: value.whole + value.numerator, numerator: 0 } : value;

const multiply = (group: Group) => (equation: Equation): Phase => {
  const values = groupValues(equation, group);
  const numerator = values.reduce((acc, value) => acc * size(value), 1);
  const denominator = values.reduce((acc, value) => acc * value.denominator, 1);
  const negatives = values.filter((value) => value.negative).length;
  const product = asWholeIfOverOne({ negative: negatives % 2 === 1 && numerator !== 0, whole: 0, numerator, denominator });
  const after = replaceGroup(equation, group, [product], []);
  const caption = "Multiply the top numbers together, then the bottom numbers together.";

  return { equation: after, steps: [makeStep("multiply", caption, after)] };
};

/** A group's result inside a longer equation: shown only when it reduces. */
const reduceAt = (equation: Equation, index: number): Phase => {
  const value = equation.values[index];

  if (value.numerator === 0) {
    const after = replaceAt(equation, index, ZERO);

    return value.denominator === 1
      ? none(equation)
      : { equation: after, steps: [makeStep("simplify", "Nothing out of anything is 0.", after)] };
  }

  const divisor = gcd(value.numerator, value.denominator);

  if (divisor === 1) {
    return none(equation);
  }

  const reduced = asWholeIfOverOne({ ...value, numerator: value.numerator / divisor, denominator: value.denominator / divisor });
  const after = replaceAt(equation, index, reduced);
  const caption = `Divide the top and bottom by ${divisor}: ${formatMixed(reduced)}.`;

  return { equation: after, steps: [makeStep("simplify", caption, after, { divisor })] };
};

/** The whole equation was one group: reduce and write it as a mixed number. */
const simplifyAnswer = (equation: Equation): Phase => {
  const [value] = equation.values;
  const top = size(value);

  if (top === 0) {
    const after = { ...equation, values: [ZERO] };

    return { equation: after, steps: [makeStep("simplify", "The answer is 0.", after)] };
  }

  const divisor = gcd(top, value.denominator);
  const [numerator, denominator] = [top / divisor, value.denominator / divisor];
  const remainder = numerator % denominator;
  const answer: Mixed = {
    negative: value.negative,
    whole: Math.floor(numerator / denominator),
    numerator: remainder,
    denominator: remainder === 0 ? 1 : denominator,
  };
  const after = { ...equation, values: [answer] };
  const reduceText = divisor > 1
    ? `Divide the top and bottom by ${divisor}.`
    : `${formatMixed(value)} cannot be divided down any more.`;
  const caption = `${reduceText} The answer is ${formatMixed(answer)}.`;

  return { equation: after, steps: [makeStep("simplify", caption, after, divisor > 1 ? { divisor } : {})] };
};

const simplifyGroup = (index: number) => (equation: Equation): Phase =>
  equation.values.length === 1 ? simplifyAnswer(equation) : reduceAt(equation, index);

/** Works each × / ÷ group, left to right, until only + and − are left. */
const workGroups = (equation: Equation): Phase => {
  const group = firstGroup(equation);

  return group === null
    ? none(equation)
    : runPhases(equation, [improper(group), reciprocal(group), multiply(group), simplifyGroup(group.start), workGroups]);
};

/**
 * The steps for an equation with at least one × or ÷.
 * Returns [] when the + and − part is too large to work exactly.
 */
export const multiplyDivideSteps = (
  values: readonly Mixed[],
  operators: readonly OPERATORS[]
): Step[] => {
  const grouped = runPhases({ values, operators }, [order, workGroups]);
  const rest = grouped.equation;

  if (rest.values.length === 1) {
    return [...grouped.steps];
  }

  const added = addSubtractSteps(rest.values, rest.operators);

  return added.length === 0 ? [] : [...grouped.steps, ...added];
};
