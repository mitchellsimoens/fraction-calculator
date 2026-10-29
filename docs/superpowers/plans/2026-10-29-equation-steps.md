# Equations and Step-by-Step Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type a multi-term fraction equation, solve it on `=`, keep the equation visible above the answer, and explain the working one step at a time in her classroom method.

**Architecture:** All logic is pure, immutable and unit-tested in three small modules: `src/equation/` (typing and evaluating a draft equation), `src/steps/` (the explanation engine, returning data not text), and the existing `src/util/fraction.ts`. The Lit components only read and write one `Draft` held in the global state and render it. Equations are stored as a flat list of terms and operators, which is easy to extend to brackets later.

**Tech Stack:** Lit 2, Tailwind 3, `@lit-app/state`, TypeScript 4.9, Vite 2. New dev-only dependencies: `tsx` and `@types/node` (tests use `node:test`, so Vite's version is irrelevant).

**Spec:** `docs/superpowers/specs/2026-10-29-equation-steps-design.md`

## Global Constraints

- Existing stack: Lit 2, Tailwind 3, `@lit-app/state`, TypeScript 4.9, Vite 2, hosted on Cloudflare Pages. No new runtime dependencies.
- Exact arithmetic only: no floating point in any result or step.
- Dark only; keep Sora, the periwinkle accent, and stacked fractions with a bar.
- Must fit iPhone Safari without clipping (dvh sizing, safe areas, a page that grows rather than clips).
- ESLint (`./node_modules/.bin/eslint src --ext .ts`), `npx tsc --noEmit` and `npm run build` must stay clean.
- Nothing is solved until `=`; `+ − × ÷` lock in the current fraction and never calculate.
- Order of operations: `×` and `÷` before `+` and `−` (author's call, unconfirmed).
- Steps never show a stale equation: any edit or clear closes the explanation.
- Parentheses are out of scope; do not design them out.

## Review Focus

Spec silences that could bite a person. Each has a test in the task named.

1. Pressing `=` with an unfinished equation (`1/2 +` or `1/`): does nothing, no crash, no wrong answer. (Task 3)
2. A typed denominator of 0 (`1/0`): rejected as invalid, never reaches the maths. (Task 3)
3. Many or large denominators overflowing safe integers: shows "too big", never a silently wrong number. (Task 2)
4. A negative term anywhere (`5 − −2`, `−2 1/4 + 1/2`) and a negative answer carried into the next equation keep their sign. (Tasks 3, 6)
5. Whole-number-only equations (`3 − 3`, `10 ÷ 4`): answer `0` and `2 1/2`, and the steps skip fraction-only steps. (Tasks 2, 6)

## File Structure

- `src/util/fraction.ts` (modify): add `lcm`.
- `src/equation/types.ts` (create): `Term`, `Draft`.
- `src/equation/editing.ts` (create): pure draft editing.
- `src/equation/evaluate.ts` (create): precedence-aware exact evaluation.
- `src/steps/types.ts`, `src/steps/mixed.ts`, `src/steps/addSubtract.ts`, `src/steps/multiplyDivide.ts`, `src/steps/explain.ts` (create): explanation engine.
- `src/state/index.ts` (modify): hold the draft, answer, error, `stepsOpen`.
- `src/components/number-container`, `operator-container`, `calc-layout`, `results-container` (modify); `src/components/steps-view/index.ts` (create).
- Tests sit beside the code as `*.test.ts`.

---

### Task 1: Test harness and `lcm`

**Files:**
- Modify: `package.json`, `src/util/fraction.ts`
- Create: `src/util/fraction.test.ts`

**Interfaces:**
- Produces: `npm test`; `export const lcm = (a: number, b: number): number` in `src/util/fraction.ts`.

- [ ] **Step 1: Install and add the script.** `npm install -D tsx @types/node`. In `package.json` add `"test": "tsx --test \"src/**/*.test.ts\""`.
- [ ] **Step 2: Write tests in `src/util/fraction.test.ts`** (`node:test` `describe`/`it`, `node:assert/strict`). First the characterisation tests, which pass at once and pin today's behaviour: `parseFraction(" 3/4")`, `parseFraction("3/4")` and `parseFraction("2 1/2")` give `{3,4}`, `{3,4}`, `{5,2}`; `parseFraction("2", true)` gives `{-2,1}`; `parseFraction("1/0")` is `null`; `formatFraction({numerator:-5,denominator:2})` is `{text:"2 1/2",negative:true}`. Then the failing one: `it("lcm is the smallest common multiple, not the product")` with `lcm(4,6)===12`, `lcm(4,5)===20`, `lcm(1,7)===7`.
- [ ] **Step 3: Run `npm test`.** Expected: only the `lcm` test fails ("lcm is not a function" or similar).
- [ ] **Step 4: Implement `lcm`** in `src/util/fraction.ts`, reusing the file's existing `gcd`.
- [ ] **Step 5: Run `npm test`.** Expected: all pass. Also `npx tsc --noEmit` and the eslint command clean.
- [ ] **Step 6: Commit** `test: add test harness and lcm`.

---

### Task 2: Evaluate an equation with order of operations

**Files:**
- Create: `src/equation/evaluate.ts`, `src/equation/evaluate.test.ts`

**Interfaces:**
- Consumes: `Fraction`, `calculate` from `src/util/fraction.ts`; `OPERATORS` from `src/util/operators.ts`.
- Produces:
  ```ts
  export type EvalResult =
    | { readonly ok: true; readonly value: Fraction }
    | { readonly ok: false; readonly reason: "divide-by-zero" | "too-large" };
  export function evaluate(values: readonly Fraction[], operators: readonly OPERATORS[]): EvalResult;
  ```
  `operators.length === values.length - 1`.

- [ ] **Step 1: Write failing tests** in `evaluate.test.ts` (values as `{numerator, denominator}`): `[1/2, 1/3, 3/4]` with `[PLUS, MULTIPLY]` is `3/4`; `[8,2,2]` with `[DIVIDE, DIVIDE]` is `2/1` (left to right); the spec example `[29/4, 13/5, 2/13]` with `[MINUS, PLUS]` is `1249/260`; `[3/1, 3/1]` with `[MINUS]` is `0/1` and `[10/1, 4/1]` with `[DIVIDE]` is `5/2` (Review Focus 5); `[1/2, 0/1]` with `[DIVIDE]` is `{ok:false, reason:"divide-by-zero"}`; `1/9007199254740991 + 1/9007199254740989` is `{ok:false, reason:"too-large"}` (Review Focus 3).
- [ ] **Step 2: Run `npm test`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement `evaluate`.** Fold `×`/`÷` runs left to right first, then `+`/`−` left to right, using `calculate`. Before each operation check every cross product with `Number.isSafeInteger`; if any fails return `too-large`. A zero divisor returns `divide-by-zero`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: evaluate equations with order of operations`.

---

### Task 3: Pure draft editing

**Files:**
- Create: `src/equation/types.ts`, `src/equation/editing.ts`, `src/equation/editing.test.ts`

**Interfaces:**
- Consumes: `splitValue` from `src/util/regex.ts`; `parseFraction`, `formatFraction`, `Fraction` from `src/util/fraction.ts`; `OPERATORS`.
- Produces (`types.ts`):
  ```ts
  export interface Term { readonly text: string; readonly negative: boolean }
  export interface Draft { readonly terms: readonly Term[]; readonly operators: readonly OPERATORS[] }
  // invariant: terms.length >= 1 and operators.length === terms.length - 1
  export type Part = "whole" | "numerator" | "denominator";
  ```
- Produces (`editing.ts`), all immutable (return a new `Draft`):
  ```ts
  export const emptyDraft: Draft;                       // one empty term, no operators
  export function currentTerm(draft: Draft): Term;      // the last term
  export function typeInto(draft: Draft, part: Part, digit: string): Draft;
  export function deleteFrom(draft: Draft, part: Part): Draft;
  export function pressOperator(draft: Draft, operator: OPERATORS): Draft;
  export function toggleSign(draft: Draft): Draft;      // flips the current term
  export function carryForward(answer: Fraction): Draft; // answer becomes the only term
  export function toFractions(draft: Draft):
    | { readonly ok: true; readonly values: Fraction[] }
    | { readonly ok: false; readonly reason: "incomplete" | "invalid" };
  ```
  A term's `text` keeps today's format: `"7 1/4"`, `" 1/4"` (leading space when there is no whole), `"3"`.

- [ ] **Step 1: Write failing tests** in `editing.test.ts`. Typing `typeInto(…,"numerator","1")` then `"denominator","4"` on `emptyDraft` gives text `" 1/4"`; adding `typeInto(…,"whole","7")` gives `"7 1/4"`. `pressOperator(d, MINUS)` adds the operator and a new empty term; pressing a second operator while the new term is empty replaces the first; pressing one on `emptyDraft` is ignored. `deleteFrom` removes the last character of the chosen part; on an empty current term with operators it removes the last operator and that term, reopening the previous term with its text intact. `toggleSign` flips only the last term. `carryForward({numerator:-5,denominator:2})` is one term `{text:"2 1/2", negative:true}` (Review Focus 4). `toFractions` returns `incomplete` for `"1/2 +"` and for `"1/"`, `invalid` for `"1/0"`, and for `7 1/4 − 2 3/5 + 2/13` returns `29/4, 13/5, 2/13` (Review Focus 1 and 2).
- [ ] **Step 2: Run `npm test`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the types and functions above. Move the part-joining logic out of `number-container`'s `formatFinalValue` into a private helper here, and use `splitValue` to read parts.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: pure draft editing for multi-term equations`.

---

### Task 4: Hold the draft in state and wire the keys

**Files:**
- Modify: `src/state/index.ts`, `src/components/number-container/index.ts`, `src/components/operator-container/index.ts`, `src/components/calc-layout/index.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3.
- Produces on `AppState`: `draft: Draft`, `answer: Fraction | null`, `error: "divide-by-zero" | "too-large" | null`, `stepsOpen: boolean`, and methods:
  ```ts
  edit(next: Draft): void;  // sets draft; clears answer, error, closes steps
  solve(): void;            // toFractions → evaluate → sets answer or error; ignores unsolvable drafts
  reset(): void;
  ```
  The old `left`, `right`, `operator`, `negative`, `showingResult` properties are removed.

- [ ] **Step 1: Replace the state properties** with the ones above (`@property({ value: emptyDraft })` etc.). `edit` is the only way keys change the draft.
- [ ] **Step 2: Update `number-container`.** Digit and `del` call `state.edit(typeInto(...))` / `state.edit(deleteFrom(...))` for the `position` prop. If `state.answer` is set, start from `emptyDraft` first (typing after `=` begins a fresh equation).
- [ ] **Step 3: Update `operator-container`.** Operator buttons call `state.edit(pressOperator(base, op))` where `base` is `carryForward(state.answer)` if an answer is showing, else `state.draft`. `=` calls `state.solve()`. Remove the now-unused fraction code and imports.
- [ ] **Step 4: Update `calc-layout`.** `Clear` calls `state.reset()`; `+/−` calls `state.edit(toggleSign(state.draft))`.
- [ ] **Step 5: Verify.** `npx tsc --noEmit`, eslint and `npm run build` clean. Then run the dev server and, with the Edge headless approach used earlier (a temporary preview page that clicks the real buttons and prints `state`), check: typing `7 1/4`, `−`, `2 3/5`, `+`, `2/13`, `=` leaves three terms and `answer` equal to `1249/260`; `del` after `+` reopens `2 3/5`; typing a digit after `=` starts fresh; an operator after `=` carries the answer. Delete the preview page.
- [ ] **Step 6: Commit** `feat: build whole equations before solving`.

---

### Task 5: Equation display

**Files:**
- Modify: `src/components/results-container/index.ts`

**Interfaces:**
- Consumes: `state.draft`, `state.answer`, `state.error`, `splitValue`, `OPERATORS_HTML`.

- [ ] **Step 1: Render the equation row** from `state.draft`: every term as a mixed number with a stacked fraction (reuse the current `renderValue`/`renderStack`), operators in the accent colour, negative terms with a leading `−`. Its font size steps down with the number of terms to a minimum of `text-2xl`; beyond that the row scrolls horizontally and keeps the end in view (`overflow-x-auto`, scroll to end after each update).
- [ ] **Step 2: Render the answer row** only when `state.answer` is set: large, using `formatFraction`, with the equation row forced to its small size. While typing, reserve the row's height so the keypad does not jump.
- [ ] **Step 3: Show errors** in the answer area in plain words: "Can't divide by zero" and "Those numbers are too big".
- [ ] **Step 4: Verify** with screenshots at 500×680 and in the iOS simulator (`xcrun simctl openurl` then `io screenshot`, as before): empty, `7 1/4 − 2 3/5 + 2/13` typed, after `=`, a 6-term equation (scrolls, nothing clipped), and a divide-by-zero. Run tsc, eslint, build.
- [ ] **Step 5: Commit** `feat: show the equation above the answer`.

---

### Task 6: Explanation engine, addition and subtraction

**Files:**
- Create: `src/steps/types.ts`, `src/steps/mixed.ts`, `src/steps/addSubtract.ts`, `src/steps/explain.ts`, `src/steps/explain.test.ts`

**Interfaces:**
- Consumes: `lcm`, `Fraction`; `Term`, `OPERATORS`.
- Produces (`types.ts`):
  ```ts
  export interface Mixed { readonly negative: boolean; readonly whole: number; readonly numerator: number; readonly denominator: number } // never auto-reduced
  export type Token =
    | { readonly kind: "value"; readonly value: Mixed; readonly multiplier?: number; readonly highlight?: boolean }
    | { readonly kind: "operator"; readonly operator: OPERATORS };
  export type StepId = "signs" | "common-denominator" | "borrow" | "combine" | "carry" | "simplify"
                     | "order" | "improper" | "reciprocal" | "multiply";
  export interface Step {
    readonly id: StepId;
    readonly caption: string;               // short plain sentence a child can read
    readonly tokens: readonly Token[];      // the equation as it stands after this step
    readonly wholes?: string;               // combine only: the arrow-down row, e.g. "6 − 2 = 4"
    readonly divisor?: number;              // simplify only: set when something was reduced
  }
  ```
- Produces (`mixed.ts`): `toMixed(term: Term): Mixed | null` (null if invalid) and `mixedToFraction(m: Mixed): Fraction`.
- Produces (`explain.ts`): `export function explain(terms: readonly Term[], operators: readonly OPERATORS[]): Step[]` — `[]` when there is one term, the draft is not solvable, or evaluation fails. In this task `explain` handles only `+`/`−` equations; Task 7 extends it.

Rules the implementer cannot guess:
- Skip `common-denominator` when all denominators already match. Otherwise rewrite every term over `lcm` of all denominators, putting each term's multiplier on its token (whole numbers untouched, a bare fraction becomes whole `0`).
- Then work left to right in pairs. Per pair: `borrow` only if the running value is positive, the fraction part is smaller than the one taken away, and the running value has a whole number (`2 1/4` to `1 5/4`); then `combine` with the `wholes` row and the fractions combined. If the first value is smaller than what is taken away overall, take the smaller from the larger, mark the result negative, and do not borrow.
- A negative term after an operator is folded into the operator in a first `signs` step (`5 − −2` becomes `5 + 2`); skip it when no term needs it. A negative first term follows the larger-from-smaller rule above.
- `carry` when the fraction part is at least a whole (`1 5/4` becomes `2 1/4`), only if it happens. The last step is always `simplify`, with `divisor` set only when it reduced something.

- [ ] **Step 1: Write failing tests** in `explain.test.ts` using `toMixed`-style terms built by hand. Assert step ids and the key tokens, not caption wording:
  - `7 1/4 − 2 3/5 + 2/13`: ids `["common-denominator","borrow","combine","combine","simplify"]`; first step values `7 65/260, 2 156/260, 0 40/260` with multipliers `65, 52, 20`; after `borrow` the first value is `6 325/260`; the combines' `wholes` are `"6 − 2 = 4"` and `"4 + 0 = 4"`; final token `4 209/260`, no `divisor`.
  - `2 1/4 − 1/2`: ids `["common-denominator","borrow","combine","simplify"]`, borrow gives `1 5/4`, result `1 3/4`.
  - `1/4 + 1/6`: first step denominator is 12 (not 24).
  - `1/8 + 5/8`: ids `["combine","simplify"]`, simplify `divisor` is 2, result `3/4`.
  - `1/2 + 3/4`: ids include `"carry"` and the result is `1 1/4`.
  - `1/4 − 3/4`: result token `negative: true`, `2/4` then simplified to `1/2`; no `borrow` step.
  - `5 − −2`: first id `"signs"`, result `7`. `−2 1/4 + 1/2`: result `negative: true`, `1 3/4` (Review Focus 4).
  - `3 − 3`: result `0`, no `common-denominator`, no `borrow` (Review Focus 5). A single term returns `[]`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `toMixed`, `mixedToFraction`, the add/subtract sequence in `addSubtract.ts`, and `explain` dispatching to it.
- [ ] **Step 4: Run `npm test`.** Expected: PASS. Run tsc and eslint.
- [ ] **Step 5: Commit** `feat: step-by-step engine for addition and subtraction`.

---

### Task 7: Explanation engine, multiply, divide and mixed equations

**Files:**
- Create: `src/steps/multiplyDivide.ts`, `src/steps/explain.property.test.ts`
- Modify: `src/steps/explain.ts`, `src/steps/explain.test.ts`

**Interfaces:**
- Consumes: Task 6's `Step`, `Mixed`, `toMixed`, `mixedToFraction`, the add/subtract sequence; `evaluate`.
- Produces: `explain` now handles any equation. Whenever a `×`/`÷` group appears, its steps run first.

Rules:
- `improper` appears only if a term in the group is a mixed number. `÷` adds a `reciprocal` step (flip the second fraction, change `÷` to `×`) before `multiply`. A group's `simplify` appears only when it reduces something. When the equation has both kinds of operator, start with an `order` step that sets `highlight: true` on the tokens that go first.
- After the groups, the remaining `+`/`−` sequence from Task 6 runs on the results, ending in the always-present `simplify`.

- [ ] **Step 1: Write failing tests.** `1 1/2 × 2/3`: ids `["improper","multiply","simplify"]`, answer `1`. `1/2 ÷ 1/4`: ids include `"reciprocal"` then `"multiply"`, answer `2`. `1/2 + 1/3 × 3/4`: ids `["order","multiply","simplify","common-denominator","combine","simplify"]`, answer `3/4`. `10 ÷ 4`: answer `2 1/2` (Review Focus 5). Property test: for 200 random equations (seeded, 2–4 terms, whole 0–9, numerator 1–9, denominator 1–9, random operators, skipping any where `evaluate` fails) the last step's value equals `evaluate`'s value after reducing both with `mixedToFraction`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `multiplyDivide.ts` and extend `explain` to run groups first.
- [ ] **Step 4: Run `npm test`.** Expected: PASS. tsc and eslint clean.
- [ ] **Step 5: Commit** `feat: explain multiplication, division and mixed equations`.

---

### Task 8: Explanation view

**Files:**
- Create: `src/components/steps-view/index.ts`
- Modify: `src/components/results-container/index.ts`, `src/components/calc-layout/index.ts`

**Interfaces:**
- Consumes: `explain`, `Step`, `Token`, `Mixed`; `state.draft`, `state.answer`, `state.stepsOpen`.
- Produces: `<steps-view>` with no props; it reads state and holds only its own `stepIndex`.

- [ ] **Step 1: Add a "Show steps" button** beside the answer (in `results-container`), visible only when `state.answer` is set and `explain(...)` returns steps. It sets `state.stepsOpen = true`.
- [ ] **Step 2: Build `steps-view`** from mockup B: a "Step n of N" line with the caption, the step's tokens drawn as stacked mixed numbers (multipliers as small accent pills, `highlight` tokens emphasised, the `wholes` row shown beneath as the arrow-down row), Back and Next buttons, a position-dots row, and a Close button that sets `state.stepsOpen = false`. Back is disabled on the first step and Next on the last. It replaces the keypad region of `calc-layout` while open; the equation and answer rows stay visible above.
- [ ] **Step 3: Verify** on 500×680 and in the iOS simulator: open the steps for `7 1/4 − 2 3/5 + 2/13`, step through all five, confirm the last step matches the answer; try `2 1/4 − 1/2` (borrow), `1/2 ÷ 1/4`, and a 6-term equation; confirm editing or `Clear` closes the view and nothing is clipped. Run tsc, eslint, build, and `npm test`.
- [ ] **Step 4: Commit** `feat: step-by-step explanation view`. Push after the owner has tried it.

---

## Self-review notes

- **Spec coverage:** entering (Tasks 3, 4), display and scrolling (5), `=` solving and order of operations (2), explanation steps and borrow/carry/simplify (6, 7), view (8), stale steps (4's `edit`, 8), division by zero (2, 5), negatives (3, 6), brackets-ready structure (flat `Draft`), tests added (1).
- **Plan calls beyond the spec** (change freely): the `reciprocal` and `signs` steps, `Show steps` placement, steps replacing the keypad area while open, and the "too big" message for overflow.
