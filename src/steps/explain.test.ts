import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluate, type EvalResult } from "../equation/evaluate";
import type { Term } from "../equation/types";
import { gcd, parseFraction, type Fraction } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { explain } from "./explain";
import { mixedToFraction, toMixed } from "./mixed";
import type { Mixed, Step, Token } from "./types";

const { DIVIDE, MINUS, MULTIPLY, PLUS } = OPERATORS;

const term = (text: string, negative = false): Term => ({ text, negative });

const mixed = (
  whole: number,
  numerator: number,
  denominator: number,
  negative = false
): Mixed => ({ negative, whole, numerator, denominator });

const ids = (steps: readonly Step[]) => steps.map((step) => step.id);

const values = (step: Step): Mixed[] =>
  step.tokens.flatMap((token) => (token.kind === "value" ? [token.value] : []));

const multipliers = (step: Step) =>
  step.tokens.flatMap((token) =>
    token.kind === "value" ? [token.multiplier] : []
  );

const last = (steps: readonly Step[]): Step => steps[steps.length - 1];

const answer = (steps: readonly Step[]): Mixed => {
  const tokens: readonly Token[] = last(steps).tokens;
  assert.equal(tokens.length, 1, "the last step holds a single value");
  const [token] = tokens;
  assert.equal(token.kind, "value");
  return (token as Extract<Token, { kind: "value" }>).value;
};

const evaluated = (fractions: readonly Fraction[], operators: readonly OPERATORS[]) => {
  const result = evaluate(fractions, operators);
  assert.ok(result.ok, "the equation evaluates");
  return (result as Extract<EvalResult, { ok: true }>).value;
};

// independent cross-check: the answer must equal what `=` shows
const expected = (terms: readonly Term[], operators: readonly OPERATORS[]) =>
  evaluated(
    terms.map((t) => parseFraction(t.text, t.negative) as Fraction),
    operators
  );

// the exact value of the equation a step shows (× and ÷ first)
const tokenValue = (step: Step): Fraction =>
  evaluated(
    values(step).map(mixedToFraction),
    step.tokens.flatMap((token) => (token.kind === "operator" ? [token.operator] : []))
  );

const isProperPart = (value: Mixed) =>
  [value.whole, value.numerator, value.denominator].every((n) => !Object.is(n, -0)) &&
  [value.whole, value.numerator].every((n) => Number.isSafeInteger(n) && n >= 0) &&
  Number.isSafeInteger(value.denominator) &&
  value.denominator > 0;

const run = (terms: readonly Term[], operators: readonly OPERATORS[]) => {
  const steps = explain(terms, operators);
  const want = expected(terms, operators);
  assert.ok(steps.length > 0, "expected steps");
  assert.equal(last(steps).id, "simplify");
  steps.forEach((step) => {
    assert.deepEqual(tokenValue(step), want, `step ${step.id} keeps the value`);
    assert.ok(values(step).every(isProperPart), `step ${step.id} parts`);
  });
  assert.deepEqual(mixedToFraction(answer(steps)), want, "answer matches calculate");
  return steps;
};

describe("toMixed / mixedToFraction", () => {
  it("reads whole, bare and mixed terms without reducing them", () => {
    assert.deepEqual(toMixed(term("7 1/4")), mixed(7, 1, 4));
    assert.deepEqual(toMixed(term(" 2/4")), mixed(0, 2, 4));
    assert.deepEqual(toMixed(term("3", true)), mixed(3, 0, 1, true));
  });

  it("rejects incomplete or zero-denominator terms", () => {
    assert.equal(toMixed(term("")), null);
    assert.equal(toMixed(term("1/")), null);
    assert.equal(toMixed(term("1/0")), null);
    assert.equal(toMixed(term("71/")), null);
  });

  it("converts to a reduced signed fraction", () => {
    assert.deepEqual(mixedToFraction(mixed(2, 1, 2, true)), {
      numerator: -5,
      denominator: 2,
    });
    assert.deepEqual(mixedToFraction(mixed(1, 2, 4)), {
      numerator: 3,
      denominator: 2,
    });
  });
});

describe("explain: addition and subtraction", () => {
  it("7 1/4 − 2 3/5 + 2/13 follows the classroom method", () => {
    const steps = run(
      [term("7 1/4"), term("2 3/5"), term(" 2/13")],
      [MINUS, PLUS]
    );

    assert.deepEqual(ids(steps), [
      "common-denominator",
      "borrow",
      "combine",
      "combine",
      "simplify",
    ]);
    assert.deepEqual(values(steps[0]), [
      mixed(7, 65, 260),
      mixed(2, 156, 260),
      mixed(0, 40, 260),
    ]);
    assert.deepEqual(multipliers(steps[0]), [65, 52, 20]);
    assert.deepEqual(values(steps[1])[0], mixed(6, 325, 260));
    assert.equal(steps[2].wholes, "6 − 2 = 4");
    assert.deepEqual(values(steps[2])[0], mixed(4, 169, 260));
    assert.equal(steps[3].wholes, "4 + 0 = 4");
    assert.deepEqual(answer(steps), mixed(4, 209, 260));
    assert.equal(last(steps).divisor, undefined);
  });

  it("2 1/4 − 1/2 borrows to 1 5/4", () => {
    const steps = run([term("2 1/4"), term(" 1/2")], [MINUS]);

    assert.deepEqual(ids(steps), [
      "common-denominator",
      "borrow",
      "combine",
      "simplify",
    ]);
    assert.deepEqual(values(steps[1])[0], mixed(1, 5, 4));
    assert.deepEqual(answer(steps), mixed(1, 3, 4));
  });

  it("borrows when the first term is a whole number only", () => {
    const steps = run([term("5"), term(" 1/2")], [MINUS]);

    assert.deepEqual(ids(steps), ["borrow", "combine", "simplify"]);
    assert.deepEqual(values(steps[0])[0], mixed(4, 2, 2));
    assert.deepEqual(answer(steps), mixed(4, 1, 2));
  });

  it("1/4 + 1/6 uses the least common denominator", () => {
    const steps = run([term(" 1/4"), term(" 1/6")], [PLUS]);

    assert.equal(steps[0].id, "common-denominator");
    assert.deepEqual(
      values(steps[0]).map((value) => value.denominator),
      [12, 12]
    );
    assert.deepEqual(multipliers(steps[0]), [3, 2]);
  });

  it("1/8 + 5/8 skips the common denominator and simplifies by 2", () => {
    const steps = run([term(" 1/8"), term(" 5/8")], [PLUS]);

    assert.deepEqual(ids(steps), ["combine", "simplify"]);
    assert.equal(last(steps).divisor, 2);
    assert.deepEqual(answer(steps), mixed(0, 3, 4));
  });

  it("1/2 + 3/4 carries into a whole", () => {
    const steps = run([term(" 1/2"), term(" 3/4")], [PLUS]);

    assert.ok(ids(steps).includes("carry"));
    assert.deepEqual(answer(steps), mixed(1, 1, 4));
  });

  it("1/2 + 1/2 carries to exactly 1", () => {
    const steps = run([term(" 1/2"), term(" 1/2")], [PLUS]);

    assert.deepEqual(ids(steps), ["combine", "carry", "simplify"]);
    assert.deepEqual(answer(steps), mixed(1, 0, 1));
  });

  it("1/4 − 3/4 takes the smaller from the larger and goes negative", () => {
    const steps = run([term(" 1/4"), term(" 3/4")], [MINUS]);

    assert.ok(!ids(steps).includes("borrow"));
    assert.deepEqual(values(steps[0])[0], mixed(0, 2, 4, true));
    assert.equal(last(steps).divisor, 2);
    assert.deepEqual(answer(steps), mixed(0, 1, 2, true));
  });

  it("1 3/4 − 2 1/4 regroups the larger value, not the smaller", () => {
    const steps = run([term("1 3/4"), term("2 1/4")], [MINUS]);

    assert.deepEqual(ids(steps), ["borrow", "combine", "simplify"]);
    assert.deepEqual(values(steps[0]), [mixed(1, 3, 4), mixed(1, 5, 4)]);
    assert.equal(steps[1].wholes, "1 − 1 = 0");
    assert.deepEqual(answer(steps), mixed(0, 1, 2, true));
  });

  it("5 − −2 folds the signs first", () => {
    const steps = run([term("5"), term("2", true)], [MINUS]);

    assert.equal(steps[0].id, "signs");
    assert.deepEqual(steps[0].tokens, [
      { kind: "value", value: mixed(5, 0, 1) },
      { kind: "operator", operator: PLUS },
      { kind: "value", value: mixed(2, 0, 1) },
    ]);
    assert.deepEqual(answer(steps), mixed(7, 0, 1));
  });

  it("−2 1/4 + 1/2 keeps the negative sign", () => {
    const steps = run([term("2 1/4", true), term(" 1/2")], [PLUS]);

    assert.ok(!ids(steps).includes("signs"));
    assert.deepEqual(answer(steps), mixed(1, 3, 4, true));
  });

  it("−1/2 − 1/4 adds the sizes and stays negative", () => {
    const steps = run([term(" 1/2", true), term(" 1/4")], [MINUS]);

    assert.deepEqual(answer(steps), mixed(0, 3, 4, true));
  });

  it("1/2 + −3/4 folds to a subtraction that goes negative", () => {
    const steps = run([term(" 1/2"), term(" 3/4", true)], [PLUS]);

    assert.equal(steps[0].id, "signs");
    assert.deepEqual(answer(steps), mixed(0, 1, 4, true));
  });

  it("3 − 3 is 0 with no fraction steps", () => {
    const steps = run([term("3"), term("3")], [MINUS]);

    assert.ok(!ids(steps).includes("common-denominator"));
    assert.ok(!ids(steps).includes("borrow"));
    assert.deepEqual(answer(steps), mixed(0, 0, 1));
    assert.equal(answer(steps).negative, false);
  });

  it("3/4 − 3/4 is exactly 0, not negative", () => {
    const steps = run([term(" 3/4"), term(" 3/4")], [MINUS]);

    assert.deepEqual(answer(steps), mixed(0, 0, 1));
  });

  it("fraction-only pairs have no 0 + 0 = 0 wholes row", () => {
    const added = run([term(" 1/8"), term(" 5/8")], [PLUS]);
    const takenAway = run([term(" 5/8"), term(" 1/8")], [MINUS]);
    const mixedPair = run([term("1 1/8"), term(" 5/8")], [PLUS]);

    [added, takenAway].forEach((steps) => {
      const combined = steps[ids(steps).indexOf("combine")];

      assert.equal(combined.wholes, undefined);
    });
    assert.equal(mixedPair[ids(mixedPair).indexOf("combine")].wholes, "1 + 0 = 1");
  });

  it("3 − 5/6 borrows without a + 0/6 part", () => {
    const steps = run([term("3"), term(" 5/6")], [MINUS]);
    const borrowed = steps[ids(steps).indexOf("borrow")];

    assert.deepEqual(values(borrowed), [mixed(2, 6, 6), mixed(0, 5, 6)]);
    assert.ok(!borrowed.caption.includes("0/6"));
    assert.deepEqual(answer(steps), mixed(2, 1, 6));
  });

  it("−2 − 1 explains why the sizes are added", () => {
    const steps = run([term("2", true), term("1")], [MINUS]);
    const combined = steps[ids(steps).indexOf("combine")];

    assert.deepEqual(operatorsOf(combined), []);
    assert.ok(combined.caption.includes("below zero"));
    assert.deepEqual(answer(steps), mixed(3, 0, 1, true));
  });

  it("−2/8 + 1/8 explains why the sizes are taken away", () => {
    const steps = run([term(" 2/8", true), term(" 1/8")], [PLUS]);
    const combined = steps[ids(steps).indexOf("combine")];

    assert.ok(combined.caption.includes("toward zero"));
    assert.deepEqual(answer(steps), mixed(0, 1, 8, true));
  });

  it("unsigned pairs carry no sign clause", () => {
    const steps = run([term("2"), term("1")], [MINUS]);
    const combined = steps[ids(steps).indexOf("combine")];

    assert.ok(!combined.caption.includes("zero"));
  });

  it("carries an improper typed term before working", () => {
    const steps = run([term("2 5/4"), term("2 3/4")], [MINUS]);

    assert.deepEqual(ids(steps), ["carry", "borrow", "combine", "simplify"]);
    assert.deepEqual(values(steps[0])[0], mixed(3, 1, 4));
    assert.deepEqual(answer(steps), mixed(0, 1, 2));
  });

  it("every small equation keeps its value at every step", () => {
    const texts = ["0", "2", " 1/2", " 3/4", "1 1/3", "2 5/6", " 4/4", "1 7/4"];
    const pool = texts.flatMap((text) => [term(text), term(text, true)]);
    const answerParts = (steps: readonly Step[]) => {
      const { numerator, denominator } = answer(steps);
      assert.ok(numerator < denominator, "answer has a proper fraction part");
      assert.ok(numerator === 0 || gcd(numerator, denominator) === 1, "reduced");
      assert.ok(numerator !== 0 || denominator === 1, "whole answer over 1");
    };

    pool.forEach((a) =>
      pool.forEach((b) =>
        [PLUS, MINUS].forEach((op) => {
          answerParts(run([a, b], [op]));
          answerParts(run([a, b, term(" 2/3")], [op, MINUS]));
        })
      )
    );
  });

  it("returns [] when there is nothing to explain", () => {
    assert.deepEqual(explain([term("1/2")], []), []);
    assert.deepEqual(explain([term("1/2"), term("1/0")], [PLUS]), []);
    assert.deepEqual(explain([term("1/2"), term("")], [PLUS]), []);
    assert.deepEqual(explain([term("1/2"), term("1/3")], []), []);
  });

  it("returns [] when the numbers are too large to be exact", () => {
    const terms = [term(" 1/9007199254740991"), term(" 1/9007199254740989")];

    assert.deepEqual(explain(terms, [PLUS]), []);
  });

  it("returns [] when only the common denominator is too large", () => {
    const terms = [term(" 1/1073741789"), term(" 1/1073741783")];

    assert.deepEqual(explain(terms, [PLUS]), []);
  });

  it("never mutates its inputs", () => {
    const terms = Object.freeze([term("7 1/4"), term("2 3/5")]);
    const operators = Object.freeze([MINUS]);

    assert.ok(explain(terms, operators).length > 0);
  });
});

const operatorsOf = (step: Step) =>
  step.tokens.flatMap((token) => (token.kind === "operator" ? [token.operator] : []));

const highlights = (step: Step) =>
  step.tokens.flatMap((token) => (token.kind === "value" ? [token.highlight === true] : []));

describe("explain: multiplication, division and mixed equations", () => {
  it("1 1/2 × 2/3 turns mixed numbers improper, multiplies, simplifies to 1", () => {
    const steps = run([term("1 1/2"), term(" 2/3")], [MULTIPLY]);

    assert.deepEqual(ids(steps), ["improper", "multiply", "simplify"]);
    assert.deepEqual(values(steps[0]), [mixed(0, 3, 2), mixed(0, 2, 3)]);
    assert.deepEqual(values(steps[1]), [mixed(0, 6, 6)]);
    assert.equal(last(steps).divisor, 6);
    assert.deepEqual(answer(steps), mixed(1, 0, 1));
  });

  it("1/2 ÷ 1/4 flips the second fraction and multiplies, giving 2", () => {
    const steps = run([term(" 1/2"), term(" 1/4")], [DIVIDE]);
    const flipped = ids(steps).indexOf("reciprocal");

    assert.ok(flipped >= 0);
    assert.equal(steps[flipped + 1].id, "multiply");
    assert.deepEqual(values(steps[flipped]), [mixed(0, 1, 2), mixed(0, 4, 1)]);
    assert.deepEqual(operatorsOf(steps[flipped]), [MULTIPLY]);
    assert.deepEqual(answer(steps), mixed(2, 0, 1));
  });

  it("1/2 + 1/3 × 3/4 does the × first, then adds", () => {
    const steps = run([term(" 1/2"), term(" 1/3"), term(" 3/4")], [PLUS, MULTIPLY]);

    assert.deepEqual(ids(steps), [
      "order",
      "multiply",
      "simplify",
      "common-denominator",
      "combine",
      "simplify",
    ]);
    assert.deepEqual(highlights(steps[0]), [false, true, true]);
    assert.deepEqual(values(steps[1]), [mixed(0, 1, 2), mixed(0, 3, 12)]);
    assert.equal(steps[2].divisor, 3);
    assert.deepEqual(values(steps[2]), [mixed(0, 1, 2), mixed(0, 1, 4)]);
    assert.deepEqual(answer(steps), mixed(0, 3, 4));
  });

  it("10 ÷ 4 is 2 1/2 with no mixed-number or common-denominator steps", () => {
    const steps = run([term("10"), term("4")], [DIVIDE]);

    assert.deepEqual(ids(steps), ["reciprocal", "multiply", "simplify"]);
    assert.deepEqual(values(steps[0]), [mixed(10, 0, 1), mixed(0, 1, 4)]);
    assert.equal(last(steps).divisor, 2);
    assert.deepEqual(answer(steps), mixed(2, 1, 2));
  });

  it("dividing by a mixed number makes it improper before flipping", () => {
    const steps = run([term("2 1/2"), term("1 1/4")], [DIVIDE]);

    assert.deepEqual(ids(steps), ["improper", "reciprocal", "multiply", "simplify"]);
    assert.deepEqual(values(steps[1]), [mixed(0, 5, 2), mixed(0, 4, 5)]);
    assert.deepEqual(answer(steps), mixed(2, 0, 1));
  });

  it("only ×: 2 × 3 × 4 is 24", () => {
    const steps = run([term("2"), term("3"), term("4")], [MULTIPLY, MULTIPLY]);

    assert.deepEqual(ids(steps), ["multiply", "simplify"]);
    assert.deepEqual(answer(steps), mixed(24, 0, 1));
  });

  it("only ÷: 8 ÷ 2 ÷ 2 works left to right to 2", () => {
    const steps = run([term("8"), term("2"), term("2")], [DIVIDE, DIVIDE]);

    assert.deepEqual(ids(steps), ["reciprocal", "multiply", "simplify"]);
    assert.deepEqual(operatorsOf(steps[0]), [MULTIPLY, MULTIPLY]);
    assert.deepEqual(answer(steps), mixed(2, 0, 1));
  });

  it("a top-heavy answer becomes a mixed number without being reduced", () => {
    const steps = run([term("3"), term(" 3/4")], [MULTIPLY]);

    assert.deepEqual(ids(steps), ["multiply", "simplify"]);
    assert.equal(last(steps).divisor, undefined);
    assert.deepEqual(answer(steps), mixed(2, 1, 4));
  });

  it("a term of 0 gives 0, never negative", () => {
    const zero = run([term("0"), term(" 1/2", true)], [MULTIPLY]);
    const zeroDivided = run([term("0"), term("1 1/2")], [DIVIDE]);
    const inSum = run([term(" 1/2", true), term("0"), term(" 1/4")], [MULTIPLY, PLUS]);

    assert.deepEqual(answer(zero), mixed(0, 0, 1));
    assert.deepEqual(answer(zeroDivided), mixed(0, 0, 1));
    assert.deepEqual(answer(inSum), mixed(0, 1, 4));
  });

  it("a negative term in a × group keeps the right sign", () => {
    const first = run([term(" 1/2", true), term(" 3/4"), term("1")], [MULTIPLY, PLUS]);
    const later = run([term(" 1/2"), term(" 1/3"), term(" 3/4", true)], [MINUS, MULTIPLY]);
    const both = run([term(" 1/2", true), term(" 1/2", true)], [DIVIDE]);

    assert.deepEqual(values(first[1])[0], mixed(0, 3, 8, true));
    assert.deepEqual(answer(first), mixed(0, 5, 8));
    assert.ok(ids(later).includes("signs"));
    assert.deepEqual(answer(later), mixed(0, 3, 4));
    assert.deepEqual(answer(both), mixed(1, 0, 1));
  });

  it("works two groups left to right before adding", () => {
    const steps = run(
      [term(" 1/2"), term(" 1/3"), term(" 1/4"), term(" 1/2")],
      [MULTIPLY, PLUS, DIVIDE]
    );

    assert.equal(steps[0].id, "order");
    assert.deepEqual(highlights(steps[0]), [true, true, true, true]);
    assert.deepEqual(values(steps[1]), [mixed(0, 1, 6), mixed(0, 1, 4), mixed(0, 1, 2)]);
    assert.deepEqual(answer(steps), mixed(0, 2, 3));
  });

  it("a top-heavy group result is carried before adding", () => {
    const steps = run([term("3"), term(" 1/2"), term(" 1/4")], [MULTIPLY, PLUS]);

    assert.deepEqual(ids(steps).slice(0, 3), ["order", "multiply", "carry"]);
    assert.deepEqual(answer(steps), mixed(1, 3, 4));
  });

  it("1/2 + 2 × 3 writes the group result as the whole number 6, with no carry", () => {
    const steps = run([term(" 1/2"), term("2"), term("3")], [PLUS, MULTIPLY]);
    const multiplied = steps[ids(steps).indexOf("multiply")];

    assert.ok(!ids(steps).includes("carry"));
    assert.deepEqual(values(multiplied), [mixed(0, 1, 2), mixed(6, 0, 1)]);
    assert.ok(steps.every((step) => values(step).every((value) => value.numerator === 0 || value.denominator !== 1)));
    assert.deepEqual(answer(steps), mixed(6, 1, 2));
  });

  it("1/2 × 4/2 + 1 reduces the group to the whole number 1, with no carry", () => {
    const steps = run([term(" 1/2"), term(" 4/2"), term("1")], [MULTIPLY, PLUS]);
    const reduced = steps[ids(steps).indexOf("simplify")];

    assert.ok(!ids(steps).includes("carry"));
    assert.equal(reduced.divisor, 4);
    assert.deepEqual(values(reduced), [mixed(1, 0, 1), mixed(1, 0, 1)]);
    assert.deepEqual(answer(steps), mixed(2, 0, 1));
  });

  it("returns [] for division by zero or numbers too large to be exact", () => {
    assert.deepEqual(explain([term(" 1/2"), term("0")], [DIVIDE]), []);
    assert.deepEqual(explain([term(" 1/2"), term(" 0/4")], [DIVIDE]), []);
    assert.deepEqual(
      explain([term("94906267"), term("94906267"), term("2")], [MULTIPLY, MULTIPLY]),
      []
    );
  });
});
