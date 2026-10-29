import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPERATORS } from "../util/operators";
import {
  answerTerm,
  carryForward,
  currentTerm,
  deleteFrom,
  emptyDraft,
  MAX_PART_DIGITS,
  pressOperator,
  toFractions,
  toggleSign,
  typeInto,
} from "./editing";
import { splitValue } from "../util/regex";
import type { Draft, Part } from "./types";

type Step = (draft: Draft) => Draft;

const build = (...steps: Step[]): Draft =>
  steps.reduce((draft, step) => step(draft), emptyDraft);

const type =
  (part: Part, digits: string): Step =>
  (draft) =>
    [...digits].reduce((acc, digit) => typeInto(acc, part, digit), draft);

const press =
  (operator: OPERATORS): Step =>
  (draft) =>
    pressOperator(draft, operator);

describe("typeInto", () => {
  it("builds text in today's format", () => {
    const quarter = build(type("numerator", "1"), type("denominator", "4"));

    assert.equal(currentTerm(quarter).text, " 1/4");
    assert.equal(currentTerm(typeInto(quarter, "whole", "7")).text, "7 1/4");
  });

  it("types a plain whole number", () => {
    assert.equal(currentTerm(build(type("whole", "3"))).text, "3");
  });

  it("does not mutate", () => {
    typeInto(emptyDraft, "whole", "1");

    assert.equal(currentTerm(emptyDraft).text, "");
  });

  it("caps each part at MAX_PART_DIGITS digits", () => {
    assert.equal(MAX_PART_DIGITS, 6);

    (["whole", "numerator", "denominator"] as const).forEach((part) => {
      const full = build(type(part, "123456"));

      assert.deepEqual(typeInto(full, part, "7"), full, `${part} ignores a 7th digit`);
    });
  });

  it("the cap is per part, so a full whole still takes a fraction", () => {
    const draft = build(type("whole", "999999"), type("numerator", "999999"), type("denominator", "999999"));

    assert.equal(currentTerm(draft).text, "999999 999999/999999");
    assert.deepEqual(typeInto(draft, "whole", "9"), draft);
  });
});

describe("pressOperator", () => {
  it("adds the operator and a new empty term", () => {
    const draft = build(type("whole", "5"), press(OPERATORS.MINUS));

    assert.deepEqual(draft.operators, [OPERATORS.MINUS]);
    assert.equal(draft.terms.length, 2);
    assert.equal(currentTerm(draft).text, "");
  });

  it("replaces the operator while the new term is empty", () => {
    const draft = build(
      type("whole", "5"),
      press(OPERATORS.MINUS),
      press(OPERATORS.PLUS)
    );

    assert.deepEqual(draft.operators, [OPERATORS.PLUS]);
    assert.equal(draft.terms.length, 2);
  });

  it("is ignored on an empty draft", () => {
    assert.deepEqual(pressOperator(emptyDraft, OPERATORS.MINUS), emptyDraft);
  });
});

describe("deleteFrom", () => {
  const full = build(
    type("whole", "12"),
    type("numerator", "3"),
    type("denominator", "45")
  );

  it("removes the last character of the chosen part", () => {
    assert.equal(currentTerm(deleteFrom(full, "denominator")).text, "12 3/4");
    assert.equal(currentTerm(deleteFrom(full, "whole")).text, "1 3/45");
    assert.equal(currentTerm(deleteFrom(full, "numerator")).text, "12 /45");
  });

  it("reopens the previous term on an empty current term", () => {
    const draft = build(
      type("whole", "7"),
      type("numerator", "1"),
      type("denominator", "4"),
      press(OPERATORS.PLUS)
    );
    const back = deleteFrom(draft, "whole");

    assert.equal(back.terms.length, 1);
    assert.deepEqual(back.operators, []);
    assert.equal(currentTerm(back).text, "7 1/4");
  });

  it("is a no-op on an empty single term", () => {
    assert.deepEqual(deleteFrom(emptyDraft, "whole"), emptyDraft);
  });
});

describe("toggleSign", () => {
  it("flips only the last term", () => {
    const draft = toggleSign(
      build(type("whole", "1"), press(OPERATORS.PLUS), type("whole", "2"))
    );

    assert.equal(draft.terms[0].negative, false);
    assert.equal(draft.terms[1].negative, true);
    assert.equal(toggleSign(draft).terms[1].negative, false);
  });
});

describe("answerTerm", () => {
  const parts = (text: string) => splitValue(text).slice(1, 4);

  it("keeps a bare fraction answer a fraction, not a whole number", () => {
    const term = answerTerm({ numerator: 3, denominator: 4 });

    assert.deepEqual(term, { text: " 3/4", negative: false });
    assert.deepEqual(parts(term.text), ["", "3", "4"]);
  });

  it("reads mixed and whole answers part by part", () => {
    assert.deepEqual(parts(answerTerm({ numerator: -13, denominator: 6 }).text), ["2", "1", "6"]);
    assert.deepEqual(parts(answerTerm({ numerator: 7, denominator: 1 }).text), ["7", "", ""]);
    assert.deepEqual(parts(answerTerm({ numerator: 0, denominator: 1 }).text), ["0", "", ""]);
  });

  it("is an empty term for a value that is not exact", () => {
    assert.deepEqual(answerTerm({ numerator: Infinity, denominator: 1 }), { text: "", negative: false });
  });
});

describe("carryForward", () => {
  it("makes the answer the only term", () => {
    const draft = carryForward({ numerator: -5, denominator: 2 });

    assert.deepEqual(draft.terms, [{ text: "2 1/2", negative: true }]);
    assert.deepEqual(draft.operators, []);
  });

  it("never carries Infinity, NaN or exponent text", () => {
    const bad = [
      { numerator: Infinity, denominator: 1 },
      { numerator: NaN, denominator: NaN },
      { numerator: 1.2345678901234568e24, denominator: 1 },
      { numerator: Number.MAX_SAFE_INTEGER + 2, denominator: 1 },
      { numerator: 1, denominator: 0 },
    ];

    bad.forEach((answer) => {
      assert.deepEqual(carryForward(answer), emptyDraft, `${answer.numerator}/${answer.denominator}`);
    });
  });
});

describe("toFractions", () => {
  it("is incomplete with a dangling operator", () => {
    const draft = build(
      type("numerator", "1"),
      type("denominator", "2"),
      press(OPERATORS.PLUS)
    );

    assert.deepEqual(toFractions(draft), { ok: false, reason: "incomplete" });
  });

  it("is incomplete for a half-typed fraction", () => {
    assert.deepEqual(toFractions(build(type("numerator", "1"))), {
      ok: false,
      reason: "incomplete",
    });
  });

  it("reports a zero denominator", () => {
    const one = build(type("numerator", "1"), type("denominator", "0"));
    const zero = build(type("numerator", "0"), type("denominator", "0"));
    const later = build(type("whole", "2"), press(OPERATORS.PLUS), type("whole", "3"), type("numerator", "1"), type("denominator", "0"));

    [one, zero, later].forEach((draft) => {
      assert.deepEqual(toFractions(draft), { ok: false, reason: "zero-denominator" });
    });
  });

  it("is too-large, never a number, when a part is not a safe integer", () => {
    const single: Draft = { terms: [{ text: "9007199254740993", negative: false }], operators: [] };
    const sum: Draft = {
      terms: [
        { text: " 1000000000000000001/1000000000000000000", negative: false },
        { text: "1", negative: false },
      ],
      operators: [OPERATORS.PLUS],
    };
    const huge: Draft = { terms: [{ text: "1234567890123456789012345", negative: false }], operators: [] };
    const fourHundred: Draft = { terms: [{ text: "9".repeat(400), negative: true }], operators: [] };
    const overHuge: Draft = { terms: [{ text: ` ${"9".repeat(400)}/${"9".repeat(400)}`, negative: false }], operators: [] };

    [single, sum, huge, fourHundred, overHuge].forEach((draft) => {
      assert.deepEqual(toFractions(draft), { ok: false, reason: "too-large" });
    });
  });

  it("is too-large when whole × denominator + numerator is not safe", () => {
    // every part is safe on its own, the improper top is not
    const draft: Draft = { terms: [{ text: "9007199254741 1/1000", negative: false }], operators: [] };

    assert.deepEqual(toFractions(draft), { ok: false, reason: "too-large" });
  });

  it("accepts the largest safe whole number", () => {
    const draft: Draft = { terms: [{ text: "9007199254740991", negative: false }], operators: [] };

    assert.deepEqual(toFractions(draft), { ok: true, values: [{ numerator: 9007199254740991, denominator: 1 }] });
  });

  it("parses a multi-term equation", () => {
    const draft = build(
      type("whole", "7"),
      type("numerator", "1"),
      type("denominator", "4"),
      press(OPERATORS.MINUS),
      type("whole", "2"),
      type("numerator", "3"),
      type("denominator", "5"),
      press(OPERATORS.PLUS),
      type("numerator", "2"),
      type("denominator", "13")
    );

    assert.deepEqual(toFractions(draft), {
      ok: true,
      values: [
        { numerator: 29, denominator: 4 },
        { numerator: 13, denominator: 5 },
        { numerator: 2, denominator: 13 },
      ],
    });
  });

  it("applies the negative flag", () => {
    const draft = toggleSign(build(type("whole", "3")));

    assert.deepEqual(toFractions(draft), {
      ok: true,
      values: [{ numerator: -3, denominator: 1 }],
    });
  });
});
