import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPERATORS } from "../util/operators";
import { isSafeFraction, solveDraft } from "./solve";
import type { Draft } from "./types";

const draft = (texts: readonly string[], operators: readonly OPERATORS[] = []): Draft => ({
  terms: texts.map((text) => ({ text, negative: false })),
  operators,
});

describe("solveDraft", () => {
  it("solves a complete draft exactly", () => {
    assert.deepEqual(solveDraft(draft([" 1/2", " 1/4"], [OPERATORS.PLUS])), {
      answer: { numerator: 3, denominator: 4 },
      error: null,
    });
  });

  it("ignores unfinished drafts", () => {
    assert.equal(solveDraft(draft([" 1/"])), null);
    assert.equal(solveDraft(draft(["1", ""], [OPERATORS.PLUS])), null);
  });

  it("says divide-by-zero for a typed zero denominator", () => {
    [draft([" 1/0"]), draft([" 0/0"]), draft(["2", "3 1/0"], [OPERATORS.MINUS])].forEach((typed) => {
      assert.deepEqual(solveDraft(typed), { answer: null, error: "divide-by-zero" });
    });
  });

  it("says divide-by-zero when dividing by 0", () => {
    assert.deepEqual(solveDraft(draft(["1", "0"], [OPERATORS.DIVIDE])), {
      answer: null,
      error: "divide-by-zero",
    });
  });

  it("says too-large instead of showing a rounded or broken number", () => {
    const cases = [
      draft(["9007199254740993"]),
      draft([" 1000000000000000001/1000000000000000000", "1"], [OPERATORS.PLUS]),
      draft(["1234567890123456789012345"]),
      draft(["9".repeat(400)]),
      draft([` ${"9".repeat(400)}/${"9".repeat(400)}`]),
      draft(["94906267", "94906267", "2"], [OPERATORS.MULTIPLY, OPERATORS.MULTIPLY]),
    ];

    cases.forEach((typed) => {
      assert.deepEqual(solveDraft(typed), { answer: null, error: "too-large" });
    });
  });

  it("only ever answers with a safe fraction", () => {
    const result = solveDraft(draft(["999999", "999999", "999999"], [OPERATORS.MULTIPLY, OPERATORS.MULTIPLY]));

    assert.ok(result !== null);
    assert.ok(
      result.answer === null
        ? result.error === "too-large"
        : Number.isSafeInteger(result.answer.numerator) && Number.isSafeInteger(result.answer.denominator)
    );
  });
});

describe("isSafeFraction", () => {
  it("accepts only safe integers over a positive denominator", () => {
    assert.equal(isSafeFraction({ numerator: -3, denominator: 4 }), true);
    assert.equal(isSafeFraction({ numerator: Infinity, denominator: 1 }), false);
    assert.equal(isSafeFraction({ numerator: NaN, denominator: 1 }), false);
    assert.equal(isSafeFraction({ numerator: 1.5, denominator: 2 }), false);
    assert.equal(isSafeFraction({ numerator: 1, denominator: 0 }), false);
    assert.equal(isSafeFraction({ numerator: Number.MAX_SAFE_INTEGER + 2, denominator: 1 }), false);
  });
});
