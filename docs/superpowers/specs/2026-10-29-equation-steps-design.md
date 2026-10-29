# Equations and step-by-step explanations: design

Date: 2026-10-29. Project: fraction-calculator.

## Intent

The calculator is used by a parent and their daughter for her fraction
homework. She learns Singapore Math, taught in a fairly traditional way:
whole number and fraction stay together, and on paper she draws an arrow
down to pull the whole numbers aside.

Today the calculator only does one operation at a time, clears the entered
numbers when it shows the result, and gives no explanation. The point of
this work is that she can see how an answer comes about, not only the
answer. The parts she finds hardest, and that matter most, are finding the
common denominator and simplifying.

## Goals

1. Type a whole equation with any number of terms, for example
   `7 1/4 − 2 3/5 + 2/13`, and solve it only when `=` is pressed.
2. After `=`, keep the equation visible, smaller, above the answer.
3. An explanation view that walks through the working one step at a time
   (Back / Next), matching her classroom method.
4. Keep the look and feel already shipped: dark only, minimalist,
   Sora, periwinkle accent, stacked fractions with a bar.

## Non-goals

- Parentheses. Wanted eventually, not now. Do not design them out: the
  equation should be stored as a structure that could take brackets later.
- Bar models, number bonds or other pictorial methods.
- A light theme, a theme switcher, accounts, history, or saving.

## Anti-goals

The owner could not name specific things to avoid and expects to iterate
after trying it. Treat the first version as something to react to. Prefer
simple behaviour that is easy to change over clever behaviour.

## Constraints

- Existing stack: Lit 2, Tailwind 3, `@lit-app/state`, TypeScript 4.9, Vite 2,
  hosted on Cloudflare Pages. No new runtime dependencies without a reason.
- Exact arithmetic only. `src/util/fraction.ts` already does exact integer
  fractions; build on it. No floating point in any result or step.
- Must fit iPhone Safari without clipping (dvh sizing, safe areas, page that
  grows rather than clips). The device simulator was used to verify this.
- The project has no test framework. Add one for the maths and step engine;
  that logic is easy to get subtly wrong and is the heart of this feature.
- ESLint, `tsc` and the build must stay clean.

## Decided with the owner

### Entering an equation

- Nothing is solved until `=` is pressed. Pressing `+`, `−`, `×` or `÷`
  locks the fraction being typed into the equation and starts the next one.
  It no longer calculates (this replaces today's chaining behaviour).
- The three keypads (whole, top, bottom) always type into the fraction
  being built.
- As the equation grows, its text shrinks until a minimum size, then the
  display scrolls.
- Parentheses are deferred.

### After `=`

- The equation stays visible, smaller, above the large answer.
- Typing a digit after `=` still starts a fresh equation (shipped
  behaviour). Pressing an operator carries the answer forward as the first
  term of a new equation.

### The explanation view

- One step at a time, with Back and Next and a position indicator
  (for example "Step 3 of 5"). It is opened from a "Show steps" control near
  the answer; it is not automatic.
- The equation and answer stay visible above the step.
- The method follows her classroom (traditional, not improper-fractions
  first) for addition and subtraction:
  1. Common denominator. Rewrite each fraction over the smallest common
     denominator, whole numbers untouched. Show each multiplier next to the
     new fraction (for example `1/4` to `65/260`, with `x65`). The
     denominator is the least common multiple, not the plain product
     (`1/4 + 1/6` uses 12, not 24).
  2. Borrow when subtracting and the first fraction is smaller than the
     second, and the first term has a whole number: take one whole and add
     it to the fraction. `2 1/4 - 1/2` becomes `1 5/4 - 1/2`, and the step
     shows where the 5 comes from (4/4 + 1/4).
  3. Subtract or add the whole numbers (the "arrow down" step), then the
     fractions.
  4. Simplify, and carry if the fraction part reaches a whole
     (`1 5/4` becomes `2 1/4`). The step names the number both parts were
     divided by, or says plainly that it is already simplest.
- Equations that contain `×` or `÷` need improper fractions, so their
  explanation includes a "turn mixed numbers into improper fractions" step.
  Steps that do not apply to a given equation are left out.

## Calls made by the author (not yet confirmed with the owner)

These are guesses. Mark them as such in the plan and keep them easy to change.

- **Order of operations:** `×` and `÷` before `+` and `−`. The explanation
  shows this as its own step when it applies. The owner was not asked to
  confirm this and was least certain about it.
- **Scrolling:** horizontal, with the newest part kept in view, rather than
  wrapping onto more lines.
- **`del`:** removes the last digit. When the fraction being typed is empty,
  it removes the last operator and reopens the fraction before it.
- **`+/-`:** flips the sign of the fraction currently being typed.
- **Two operators in a row:** the second replaces the first.
- **Several terms:** put every fraction over one shared common denominator
  first, then work left to right in pairs, borrowing where needed. For
  `7 1/4 - 2 3/5 + 2/13` that gives `7 65/260 - 2 156/260`, which borrows
  to `6 325/260 - 2 156/260 = 4 169/260`, then `+ 40/260` gives
  `4 209/260`.
- **Borrowing with negatives (confirmed in review):** borrow from whichever
  value is larger in size and never from the smaller one, so `-2 1/4 + 1/2`
  and `1 3/4 - 2 1/4` work. Whole numbers do not count towards the common
  denominator check, a multiplier of 1 is not shown, and a borrow can come
  before any common-denominator step (`3 - 5/6`).
- **Typing limits:** each part (whole, top, bottom) takes at most 6 digits;
  anything that could not be calculated exactly shows "Those numbers are too
  big" and a typed `/0` shows "Can't divide by zero".
- **Arrow-down visual:** show the whole numbers dropping into their own row
  beneath the working. Exact styling is for the builder.
- **Division by zero:** keep today's behaviour (do nothing, leave the
  equation as typed), but say so on screen rather than silently ignoring it.
- **Negative intermediate or final results:** show a leading minus, as the
  calculator does today. When the first term is smaller than what is taken
  away (for example `1/4 - 3/4`), the step takes the smaller from the larger
  and says the answer is negative, rather than borrowing from a whole that
  is not there.
- **Equations mixing `x` or `/` with `+` or `-`:** do the `x` and `/` parts
  first, each as its own sub-sequence with improper fractions, then run the
  add/subtract steps on the results.
- **Stale steps:** the explanation closes as soon as the equation is edited
  or cleared, so it never shows steps for an old equation.

## Left to the builder

- How the equation and its state are represented (a list of terms and
  operators, ready to take brackets later is the only requirement).
- Visual design of the small equation, the step card and the arrow-down
  row, within the existing look.
- Wording of each step's caption, in plain, short sentences a child can read.
- Test framework choice and file layout.
- Whether the step engine returns data (for rendering) or text; data is
  recommended so wording and layout can change without touching the maths.

## How to know it works

- Every example in this document produces the stated steps and answer.
- The answer shown by `=` always equals the last step of the explanation.
- Property check: for random small equations, the exact answer from the step
  engine equals the exact answer from `fraction.ts`.
- On an iPhone-sized screen nothing is clipped while typing a long
  equation, while viewing steps, or after `=`.
