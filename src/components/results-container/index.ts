import { StateController } from "@lit-app/state";
import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { OPERATORS_HTML } from "../../util/operators";
import { splitValue } from "../../util/regex";

/**
 * The display. Values are drawn as real mixed numbers: a whole part
 * next to a stacked fraction with its bar.
 */
@customElement("results-container")
export class ResultsContainer extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div
        class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 w-full min-h-[6.5rem] px-3 py-4 font-sans font-extralight tabular-nums text-fg text-5xl sm:text-6xl"
        role="status"
        aria-live="polite"
      >
        ${this.renderValue(state.left, state.negative, "0")}
        ${this.renderOperator()}
        ${this.renderValue(state.right, false, "")}
      </div>
    `;
  }

  private renderOperator() {
    const { operator } = state;

    if (operator == null) {
      return nothing;
    }

    return html`<span class="text-accent font-light"
      >${unsafeHTML(OPERATORS_HTML[operator])}</span
    >`;
  }

  private renderValue(value: string, negative: boolean, empty: string) {
    const [, whole, numerator, denominator] = splitValue(value);
    const hasFraction = value.includes("/");

    if (!whole && !hasFraction && !empty) {
      return nothing;
    }

    return html`<span class="inline-flex items-center gap-3">
      ${negative ? html`<span class="text-accent">&minus;</span>` : nothing}
      ${whole || !hasFraction ? html`<span>${whole || empty}</span>` : nothing}
      ${hasFraction ? this.renderStack(numerator, denominator) : nothing}
    </span>`;
  }

  private renderStack(numerator: string, denominator: string) {
    // a faint box marks a part that has not been typed yet
    const slot = (digits: string) =>
      digits
        ? html`${digits}`
        : html`<span
            class="inline-block h-[0.55em] w-[0.4em] rounded-sm border border-line"
          ></span>`;

    return html`<span
      class="inline-flex flex-col items-stretch text-center text-[0.55em] leading-none"
    >
      <span class="px-1 pb-2 min-h-[1em]">${slot(numerator)}</span>
      <span class="h-px bg-accent shadow-glow"></span>
      <span class="px-1 pt-2 min-h-[1em]">${slot(denominator)}</span>
    </span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "results-container": ResultsContainer;
  }
}
