import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fraction } from "../util/fraction";
import { OPERATORS } from "../util/operators";
import { evaluate } from "./evaluate";

const f = (numerator: number, denominator = 1): Fraction => ({
  numerator,
  denominator,
});

describe("evaluate", () => {
  it("applies multiplication before addition", () => {
    assert.deepEqual(
      evaluate([f(1, 2), f(1, 3), f(3, 4)], [OPERATORS.PLUS, OPERATORS.MULTIPLY]),
      { ok: true, value: f(3, 4) }
    );
  });

  it("divides left to right", () => {
    assert.deepEqual(
      evaluate([f(8), f(2), f(2)], [OPERATORS.DIVIDE, OPERATORS.DIVIDE]),
      { ok: true, value: f(2) }
    );
  });

  it("evaluates the spec example", () => {
    assert.deepEqual(
      evaluate(
        [f(29, 4), f(13, 5), f(2, 13)],
        [OPERATORS.MINUS, OPERATORS.PLUS]
      ),
      { ok: true, value: f(1249, 260) }
    );
  });

  it("returns zero as 0/1", () => {
    assert.deepEqual(evaluate([f(3), f(3)], [OPERATORS.MINUS]), {
      ok: true,
      value: f(0),
    });
  });

  it("reduces results", () => {
    assert.deepEqual(evaluate([f(10), f(4)], [OPERATORS.DIVIDE]), {
      ok: true,
      value: f(5, 2),
    });
  });

  it("reports division by zero", () => {
    assert.deepEqual(evaluate([f(1, 2), f(0)], [OPERATORS.DIVIDE]), {
      ok: false,
      reason: "divide-by-zero",
    });
  });

  it("reports results too large for exact arithmetic", () => {
    assert.deepEqual(
      evaluate(
        [f(1, 9007199254740991), f(1, 9007199254740989)],
        [OPERATORS.PLUS]
      ),
      { ok: false, reason: "too-large" }
    );
  });
});
