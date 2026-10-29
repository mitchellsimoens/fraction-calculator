import { OPERATORS } from "../util/operators";
import { type Equation, makeStep, type Phase, size } from "./equation";
import { formatMixed, MINUS_SIGN } from "./mixed";
import type { Mixed, Step } from "./types";

/*
 * Works the first pair of an add/subtract equation, classroom style.
 * Every value already shares one denominator and has a proper fraction part;
 * every value after the first is positive (signs were folded earlier).
 */

const withFirst = (equation: Equation, value: Mixed): Equation => ({
  values: [value, ...equation.values.slice(2)],
  operators: equation.operators.slice(1),
});

const replaceAt = (equation: Equation, index: number, value: Mixed): Equation => ({
  ...equation,
  values: equation.values.map((old, at) => (at === index ? value : old)),
});

const signed = (value: Omit<Mixed, "negative">, negative: boolean): Mixed => ({
  ...value,
  negative: negative && (value.whole !== 0 || value.numerator !== 0),
});

const carryPart = (m: Mixed): Mixed => ({
  ...m,
  whole: m.whole + Math.floor(m.numerator / m.denominator),
  numerator: m.numerator % m.denominator,
});

/** A carry step when the fraction part is at least one whole, else nothing. */
export const carryIfNeeded = (equation: Equation, index: number): Phase => {
  const value = equation.values[index];

  if (value.numerator < value.denominator) {
    return { equation, steps: [] };
  }

  const carried = replaceAt(equation, index, carryPart(value));
  const caption = `${formatMixed(value)} has a whole inside it, so it becomes ${formatMixed(carryPart(value))}.`;

  return { equation: carried, steps: [makeStep("carry", caption, carried)] };
};

const GOING_FURTHER_BELOW = "Taking away from a number below zero goes further below zero.";

const MOVING_TOWARD_ZERO = "A plus moves a number below zero back toward zero.";

// fraction-only pairs have no whole numbers to show, so no "0 + 0 = 0" row
const wholesRow = (left: number, operator: string, right: number, result: number): { wholes?: string } =>
  left === 0 && right === 0 ? {} : { wholes: `${left} ${operator} ${right} = ${result}` };

// name only the parts the pair has: no "add the fractions" for 5 + 2
const partsCaption = (verb: "Add" | "Take away", left: Mixed, right: Mixed): string => {
  if (left.whole === 0 && right.whole === 0) {
    return `${verb} the fractions.`;
  }
  if (left.numerator === 0 && right.numerator === 0) {
    return `${verb} the whole numbers.`;
  }

  return `${verb} the whole numbers, then ${verb.toLowerCase()} the fractions.`;
};

const addSizes = (equation: Equation): Phase => {
  const [running, next] = equation.values;
  const whole = running.whole + next.whole;
  const result = signed(
    { whole, numerator: running.numerator + next.numerator, denominator: running.denominator },
    running.negative
  );
  const after = withFirst(equation, result);
  const order = partsCaption("Add", running, next);
  // −a − b: say why a minus sign is worked by adding
  const caption = running.negative ? `${GOING_FURTHER_BELOW} ${order}` : order;
  const combined = makeStep("combine", caption, after, wholesRow(running.whole, "+", next.whole, whole));

  return { equation: after, steps: [combined] };
};

const borrowCaption = (value: Mixed): string => {
  const { whole, numerator, denominator } = value;
  const one = `${denominator}/${denominator}`;

  // nothing to add the borrowed whole to, so do not show "+ 0/6"
  return numerator === 0
    ? `Borrow 1 whole from ${whole}: 1 whole is ${one}.`
    : `Borrow 1 whole from ${whole}: ${one} + ${numerator}/${denominator} makes ${numerator + denominator}/${denominator}.`;
};

const borrow = (equation: Equation, index: number): Phase => {
  const value = equation.values[index];

  if (value.numerator >= equation.values[1 - index].numerator) {
    return { equation, steps: [] };
  }

  const borrowed = { ...value, whole: value.whole - 1, numerator: value.numerator + value.denominator };
  const after = replaceAt(equation, index, borrowed);
  const caption = borrowCaption(value);

  return { equation: after, steps: [makeStep("borrow", caption, after)] };
};

const subtractSizes = (equation: Equation): Phase => {
  const [running] = equation.values;
  // take the smaller from the larger; borrow only ever from the larger
  const largerIndex = size(running) >= size(equation.values[1]) ? 0 : 1;
  const borrowed = borrow(equation, largerIndex);
  const larger = borrowed.equation.values[largerIndex];
  const smaller = borrowed.equation.values[1 - largerIndex];
  const whole = larger.whole - smaller.whole;
  const negative = largerIndex === 0 ? running.negative : !running.negative;
  const result = signed(
    { whole, numerator: larger.numerator - smaller.numerator, denominator: larger.denominator },
    negative
  );
  const after = withFirst(borrowed.equation, result);
  const order = largerIndex === 0
    ? partsCaption("Take away", larger, smaller)
    : "The second number is bigger, so take the smaller from the larger.";
  // −a + b: say why a plus sign is worked by taking away
  const why = running.negative ? `${MOVING_TOWARD_ZERO} ${order}` : order;
  const caption = result.negative ? `${why} The answer is negative.` : why;
  const wholes = wholesRow(larger.whole, MINUS_SIGN, smaller.whole, whole);
  const steps: readonly Step[] = [...borrowed.steps, makeStep("combine", caption, after, wholes)];

  return { equation: after, steps };
};

/** borrow (if needed), combine, carry (if needed) for the first pair. */
export const workFirstPair = (equation: Equation): Phase => {
  const [running] = equation.values;
  // −a − b and a + b both add sizes; the rest take one size from the other
  const addsSizes = running.negative === (equation.operators[0] === OPERATORS.MINUS);
  const combined = addsSizes ? addSizes(equation) : subtractSizes(equation);
  const carried = carryIfNeeded(combined.equation, 0);

  return { equation: carried.equation, steps: [...combined.steps, ...carried.steps] };
};
