import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { Mixed, Step, Token } from "../../steps/types";
import { renderOperator, renderSign, renderStack } from "../math";

type ValueToken = Extract<Token, { kind: "value" }>;

interface ValueLook {
  // some token in the step is highlighted, so the others step back
  readonly dimmed: boolean;
  // the step is about denominators, so they glow
  readonly accentDenominator: boolean;
}

const isValue = (token: Token): token is ValueToken => token.kind === "value";

// a fraction part is drawn unless it is the "n/1 with nothing on top" of a whole
const hasFraction = ({ numerator, denominator }: Mixed): boolean =>
  !(numerator === 0 && denominator === 1);

export const renderMixed = (
  value: Mixed,
  denominatorClass = ""
): TemplateResult => {
  const fraction = hasFraction(value);
  const showWhole = value.whole > 0 || !fraction;

  return html`<span class="inline-flex items-center gap-[0.25em]">
    ${renderSign(value.negative)}
    ${showWhole ? html`<span>${value.whole}</span>` : nothing}
    ${fraction
      ? renderStack(
          String(value.numerator),
          String(value.denominator),
          denominatorClass
        )
      : nothing}
  </span>`;
};

const renderPill = (multiplier: number | undefined) =>
  multiplier == null
    ? nothing
    : html`<span
        class="self-center rounded-full border border-accent/60 px-2 py-0.5 text-sm font-normal leading-none text-accent"
        >&times;${multiplier}</span
      >`;

// highlighted values are lifted onto a soft panel; the rest step back
const valueTone = (token: ValueToken, look: ValueLook): string => {
  if (token.highlight) {
    return "bg-raised ring-1 ring-accent/50 text-fg";
  }

  return look.dimmed ? "text-mute" : "";
};

const renderValueToken = (token: ValueToken, look: ValueLook) => html`<span
  class="inline-flex items-center gap-2 rounded-2xl px-2 py-1 ${valueTone(
    token,
    look
  )}"
  >${renderMixed(token.value, look.accentDenominator ? "text-accent" : "")}
  ${renderPill(token.multiplier)}</span
>`;

// each operator travels with the value after it, so a long line wraps
// between terms and never leaves "÷" stranded at the end of a row
const groupTokens = (tokens: readonly Token[]): Token[][] =>
  tokens.reduce<Token[][]>(
    (groups, token, index) =>
      token.kind === "operator" || index === 0
        ? [...groups, [token]]
        : [...groups.slice(0, -1), [...groups[groups.length - 1], token]],
    []
  );

export const renderTokens = (step: Step) => {
  const look: ValueLook = {
    dimmed: step.tokens.some((token) => isValue(token) && token.highlight),
    accentDenominator: step.id === "common-denominator",
  };

  return groupTokens(step.tokens).map(
    (group) => html`<span class="inline-flex items-center gap-2"
      >${group.map((token) =>
        isValue(token)
          ? renderValueToken(token, look)
          : renderOperator(token.operator)
      )}</span
    >`
  );
};

export const countValues = (step: Step): number =>
  step.tokens.filter(isValue).length;

/**
 * The wholes row shows sizes only ("2 + 1 = 3"). When the result in front
 * is negative, say so beside it, so the row never reads as the answer's sign.
 */
export const renderWholes = (step: Step) => {
  if (!step.wholes) {
    return nothing;
  }

  const [first] = step.tokens;
  const negative =
    first != null && isValue(first) && first.value.negative && first.value.whole > 0;

  return html`<p
    class="flex items-center gap-2 self-center rounded-full border border-line px-4 py-1.5 text-xl font-light tabular-nums text-fg"
  >
    <svg
      class="h-4 w-4 flex-none text-accent"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" />
    </svg>
    <span class="sr-only">Whole numbers:</span>
    <span>${step.wholes}</span>
    ${negative
      ? html`<span class="text-accent"
          ><span aria-hidden="true">&rarr;</span
          ><span class="sr-only">so</span> &minus;&thinsp;${first.value.whole}</span
        >`
      : nothing}
  </p>`;
};
