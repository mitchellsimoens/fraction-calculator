import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculate, formatFraction, lcm, parseFraction, type Fraction } from "./fraction";
import { OPERATORS } from "./operators";

describe("parseFraction", () => {
  it("parses typed, bare and mixed input", () => {
    assert.deepEqual(parseFraction(" 3/4"), { numerator: 3, denominator: 4 });
    assert.deepEqual(parseFraction("3/4"), { numerator: 3, denominator: 4 });
    assert.deepEqual(parseFraction("2 1/2"), { numerator: 5, denominator: 2 });
  });

  it("applies the negative flag", () => {
    assert.deepEqual(parseFraction("2", true), { numerator: -2, denominator: 1 });
  });

  it("returns null for a zero denominator", () => {
    assert.equal(parseFraction("1/0"), null);
  });
});

describe("formatFraction", () => {
  it("formats a negative improper fraction as a mixed number", () => {
    assert.deepEqual(formatFraction({ numerator: -5, denominator: 2 }), {
      text: "2 1/2",
      negative: true,
    });
  });
});

describe("lcm", () => {
  it("lcm is the smallest common multiple, not the product", () => {
    assert.equal(lcm(4, 6), 12);
    assert.equal(lcm(4, 5), 20);
    assert.equal(lcm(1, 7), 7);
  });
});

describe("no negative zero", () => {
  it("0 × −1/2 has a numerator of +0, not -0", () => {
    const zero = parseFraction("0") as Fraction;
    const negativeHalf = parseFraction("1/2", true) as Fraction;
    const product = calculate(zero, OPERATORS.MULTIPLY, negativeHalf) as Fraction;

    assert.ok(Object.is(product.numerator, 0), "numerator is +0");
    assert.deepStrictEqual(product, { numerator: 0, denominator: 1 });
  });

  it("parsing −0 and −0/4 gives +0", () => {
    assert.ok(Object.is(parseFraction("0", true)?.numerator, 0));
    assert.ok(Object.is(parseFraction("0/4", true)?.numerator, 0));
  });
});
