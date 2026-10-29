import { StateController } from "@lit-app/state";
import { html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { explain } from "../../steps/explain";
import { answerTerm } from "../../equation/editing";
import { splitValue } from "../../util/regex";
import { renderEmptySlot, renderOperator, renderSign, renderStack } from "../math";

/**
 * The display. Values are drawn as real mixed numbers: a whole part
 * next to a stacked fraction with its bar.
 */
@customElement("results-container")
export class ResultsContainer extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    const { draft, answer, error } = state;
    const solved = answer != null || error != null;

    return html`
      <div
        class="flex h-24 min-w-0 flex-1 flex-col justify-end px-3 font-sans font-extralight tabular-nums text-fg"
      >
        <div
          class="equation flex min-h-0 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${solved ? "h-8 flex-none" : "flex-1"} ${this.equationSize(
            draft.terms.length,
            solved,
          )}"
          aria-label="Equation"
        >
          <div class="ml-auto flex items-center gap-x-3 whitespace-nowrap">
            ${draft.terms.map(
              (term, index) => html`
                ${index > 0 ? renderOperator(draft.operators[index - 1]) : nothing}
                ${this.renderValue(term.text, term.negative, draft.terms.length === 1 ? "0" : "")}
              `,
            )}
          </div>
        </div>

        <div
          class=${solved ? "flex h-16 flex-none items-center gap-3" : "h-0 overflow-hidden"}
        >
          ${this.renderShowSteps()}
          <div
            class="flex h-full min-w-0 flex-1 items-center justify-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="status"
            aria-live="polite"
          >
            ${this.renderAnswer()}
          </div>
        </div>
      </div>
    `;
  }

  private resizeObserver?: ResizeObserver;

  protected override firstUpdated() {
    // content width also changes when the web font loads, so follow it
    const inner = this.renderRoot.querySelector(".equation > div");

    if (inner && typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.scrollToEnd());
      this.resizeObserver.observe(inner);
    }
  }

  // the steps were open on the previous render
  private wasOpen = false;

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    this.scrollToEnd();
    this.returnFocusAfterSteps();
  }

  // closing the steps hands focus back to the control that opened them
  private returnFocusAfterSteps() {
    const closed = this.wasOpen && !state.stepsOpen;

    this.wasOpen = state.stepsOpen;

    if (closed) {
      this.renderRoot.querySelector<HTMLElement>(".show-steps")?.focus();
    }
  }

  // only offered when there is working to show for this answer
  private hasSteps(): boolean {
    const { draft, answer } = state;

    return answer != null && explain(draft.terms, draft.operators).length > 0;
  }

  private renderShowSteps() {
    if (state.stepsOpen || !this.hasSteps()) {
      return nothing;
    }

    return html`<button
      type="button"
      class="show-steps flex-none min-h-[2.75rem] rounded-full border border-accent/40 px-4 text-sm font-normal text-accent transition-colors duration-150 motion-reduce:transition-none hover:border-accent hover:bg-raised active:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      @click=${this.onShowSteps}
    >
      Show steps
    </button>`;
  }

  private onShowSteps = () => {
    state.stepsOpen = true;
  };

  override disconnectedCallback() {
    this.resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  // keep the newest part of a long equation in view
  private scrollToEnd() {
    const row = this.renderRoot.querySelector<HTMLElement>(".equation");

    if (row) {
      row.scrollLeft = row.scrollWidth;
    }
  }

  // the font steps down as terms are added; solving forces it small
  private equationSize(terms: number, solved: boolean): string {
    if (solved || terms >= 5) {
      return solved ? "text-xl" : "text-2xl";
    }
    if (terms === 4) {
      return "text-3xl";
    }
    if (terms === 3) {
      return "text-4xl";
    }

    return "text-5xl";
  }

  private renderAnswer() {
    const { answer, error } = state;

    if (error) {
      const message =
        error === "divide-by-zero"
          ? "Can't divide by zero"
          : "Those numbers are too big";

      return html`<span class="text-xl font-light text-accent"
        >${message}</span
      >`;
    }

    if (!answer) {
      return nothing;
    }

    // the typed format, so a bare 3/4 is not read as the whole number 3
    const { text, negative } = answerTerm(answer);

    return html`<span class="ml-auto inline-flex items-center text-5xl leading-none whitespace-nowrap"
      >${this.renderValue(text, negative, "0")}</span
    >`;
  }

  private renderValue(value: string, negative: boolean, empty: string) {
    const [, whole, numerator, denominator] = splitValue(value);
    const hasFraction = value.includes("/");

    if (!whole && !hasFraction && !empty) {
      // a sign on a term not typed yet must still be seen
      return negative
        ? html`<span class="inline-flex items-center gap-1"
            >${renderSign(true)}${renderEmptySlot()}</span
          >`
        : nothing;
    }

    return html`<span class="inline-flex items-center gap-3">
      ${renderSign(negative)}
      ${whole || !hasFraction ? html`<span>${whole || empty}</span>` : nothing}
      ${hasFraction ? renderStack(numerator, denominator) : nothing}
    </span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "results-container": ResultsContainer;
  }
}
