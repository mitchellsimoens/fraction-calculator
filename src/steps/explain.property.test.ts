import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluate } from "../equation/evaluate";
import type { Term } from "../equation/types";
import { gcd, parseFraction, type Fraction } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { explain } from "./explain";
import { mixedToFraction } from "./mixed";
import type { Mixed, Step } from "./types";

const ALL_OPERATORS = [OPERATORS.PLUS, OPERATORS.MINUS, OPERATORS.MULTIPLY, OPERATORS.DIVIDE];

/** mulberry32: a tiny seeded generator, so every run tests the same equations. */
const seeded = (seed: number) => {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Random = () => number;

const between = (random: Random, low: number, high: number): number =>
  low + Math.floor(random() * (high - low + 1));

const pick = <T>(random: Random, items: readonly T[]): T => items[between(random, 0, items.length - 1)];

// the brief's terms: whole 0–9, numerator 1–9, denominator 1–9
const fractionTerm = (random: Random): Term => {
  const whole = between(random, 0, 9);
  const fraction = `${between(random, 1, 9)}/${between(random, 1, 9)}`;

  return { text: whole === 0 ? ` ${fraction}` : `${whole} ${fraction}`, negative: random() < 0.25 };
};

// wider: also whole numbers only and zero
const anyTerm = (random: Random): Term => {
  const kind = between(random, 0, 3);

  if (kind === 0) {
    return { text: String(between(random, 0, 12)), negative: random() < 0.25 };
  }

  return kind === 1 ? { text: "0", negative: false } : fractionTerm(random);
};

const values = (step: Step): Mixed[] =>
  step.tokens.flatMap((token) => (token.kind === "value" ? [token.value] : []));

const operatorsOf = (step: Step): OPERATORS[] =>
  step.tokens.flatMap((token) => (token.kind === "operator" ? [token.operator] : []));

const stepValue = (step: Step) => evaluate(values(step).map(mixedToFraction), operatorsOf(step));

const checkAnswerForm = (answer: Mixed) => {
  assert.ok(answer.numerator < answer.denominator, "proper fraction part");
  assert.ok(answer.numerator === 0 ? answer.denominator === 1 : gcd(answer.numerator, answer.denominator) === 1);
  assert.ok(!(answer.negative && answer.whole === 0 && answer.numerator === 0), "zero is not negative");
};

const checkEquation = (terms: readonly Term[], operators: readonly OPERATORS[]): boolean => {
  const result = evaluate(terms.map((t) => parseFraction(t.text, t.negative) as Fraction), operators);

  if (!result.ok) {
    return false;
  }

  const steps = explain(terms, operators);
  const label = terms.map((t) => `${t.negative ? "−" : ""}${t.text.trim()}`).join(" ? ");
  assert.ok(steps.length > 0, `steps for ${label}`);
  steps.forEach((step) => assert.deepEqual(stepValue(step), result, `${step.id} keeps the value of ${label}`));

  const finalValues = values(steps[steps.length - 1]);
  assert.equal(finalValues.length, 1);
  assert.deepEqual(mixedToFraction(finalValues[0]), result.value, label);
  checkAnswerForm(finalValues[0]);

  return true;
};

const runMany = (seed: number, count: number, makeTerm: (random: Random) => Term) => {
  const random = seeded(seed);
  const checked = Array.from({ length: count }, () => {
    const size = between(random, 2, 4);
    const terms = Array.from({ length: size }, () => makeTerm(random));
    const operators = Array.from({ length: size - 1 }, () => pick(random, ALL_OPERATORS));

    return checkEquation(terms, operators);
  });

  return checked.filter(Boolean).length;
};

describe("explain: property tests", () => {
  it("200 random equations end on the same value `=` gives", () => {
    const checked = runMany(20261029, 200, fractionTerm);

    assert.ok(checked >= 190, `only ${checked} of 200 could be checked`);
  });

  it("300 random equations with whole numbers and zeros keep their value at every step", () => {
    const checked = runMany(7, 300, anyTerm);

    assert.ok(checked >= 250, `only ${checked} of 300 could be checked`);
  });
});
