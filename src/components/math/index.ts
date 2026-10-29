import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { OPERATORS, OPERATORS_HTML } from "../../util/operators";

/**
 * Shared pieces for drawing maths: a sign, an operator and a stacked
 * fraction with its glowing bar. Used by the display and the steps view.
 */

export const renderSign = (negative: boolean) =>
  negative ? html`<span class="text-accent">&minus;</span>` : nothing;

export const renderOperator = (operator: OPERATORS) =>
  html`<span class="text-accent font-light"
    >${unsafeHTML(OPERATORS_HTML[operator])}</span
  >`;

// a faint box marks a part that has not been typed yet
export const renderEmptySlot = () =>
  html`<span
    class="inline-block h-[0.55em] w-[0.4em] rounded-sm border border-line"
  ></span>`;

const slot = (digits: string) => (digits ? html`${digits}` : renderEmptySlot());

export const renderStack = (
  numerator: string,
  denominator: string,
  denominatorClass = ""
) => html`<span
  class="inline-flex flex-col items-stretch text-center text-[0.55em] leading-none"
>
  <span class="px-1 pb-[0.2em] min-h-[1em]">${slot(numerator)}</span>
  <span class="h-px bg-accent shadow-glow"></span>
  <span class="px-1 pt-[0.2em] min-h-[1em] ${denominatorClass}"
    >${slot(denominator)}</span
  >
</span>`;
