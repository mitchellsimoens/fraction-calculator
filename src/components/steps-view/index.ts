import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement, state as internal } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { explain } from "../../steps/explain";
import type { Step } from "../../steps/types";
import { countValues, renderTokens, renderWholes } from "./tokens";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const NAV_BUTTON = `min-h-[2.75rem] min-w-[5rem] flex-none rounded-xl px-4 text-base transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed ${FOCUS}`;

/**
 * The working for the solved equation, one step at a time. It takes the
 * keypad's place while open; it only remembers which step is showing.
 */
@customElement("steps-view")
export class StepsView extends TwLitElement {
  state = new StateController(this, state);

  @internal() private stepIndex = 0;

  // the live region starts empty so the first caption is announced too
  @internal() private ready = false;

  private get steps(): Step[] {
    return explain(state.draft.terms, state.draft.operators);
  }

  override render() {
    const { steps } = this;

    if (steps.length === 0) {
      return this.renderNoSteps();
    }

    const stepIndex = this.shownIndex(steps.length);
    const step = steps[stepIndex];
    const position = `Step ${stepIndex + 1} of ${steps.length}`;

    return html`
      <section
        class="flex h-full min-h-0 flex-1 flex-col border-t border-line px-3 pt-2 pb-1 font-sans text-fg"
        aria-label="Steps"
      >
        ${this.renderHeader(position)}
        ${keyed(stepIndex, this.renderStep(step))}
        ${this.renderNav(steps.length, stepIndex)}
        <p class="sr-only" aria-live="polite">
          ${this.ready ? `${position}. ${step.caption}` : ""}
        </p>
      </section>
    `;
  }

  private renderHeader(position: string) {
    return html`<div class="flex items-center justify-between gap-3">
      <p class="text-sm font-normal text-mute">${position}</p>
      <button
        type="button"
        class="close min-h-[2.75rem] rounded-xl px-3 text-sm text-mute transition-colors duration-150 motion-reduce:transition-none hover:text-fg ${FOCUS}"
        aria-label="Close steps"
        @click=${this.onClose}
      >
        Close
      </button>
    </div>`;
  }

  // there is always a way out, even with nothing to show
  private renderNoSteps() {
    return html`<section
      class="flex h-full min-h-0 flex-1 flex-col border-t border-line px-3 pt-2 pb-1 font-sans text-fg"
      aria-label="Steps"
    >
      ${this.renderHeader("")}
      <p class="flex flex-1 items-center justify-center text-center text-lg font-light text-fg" role="status">
        There are no steps for this equation.
      </p>
    </section>`;
  }

  private renderStep(step: Step) {
    return html`<div
      class="flex min-h-0 flex-1 flex-col justify-center gap-6 overflow-y-auto py-2 motion-safe:animate-step-in"
    >
      <p class="text-center text-lg font-light leading-snug text-fg">
        ${step.caption}
      </p>
      <div
        class="flex flex-wrap items-center justify-center gap-x-2 gap-y-4 font-extralight tabular-nums ${this.tokenSize(
          countValues(step)
        )}"
      >
        ${renderTokens(step)}
      </div>
      ${renderWholes(step)}
    </div>`;
  }

  // fewer numbers on the line can be drawn bigger
  private tokenSize(values: number): string {
    if (values <= 2) {
      return "text-5xl";
    }
    if (values === 3) {
      return "text-4xl";
    }

    return values === 4 ? "text-3xl" : "text-2xl";
  }

  private renderNav(total: number, stepIndex: number) {

    return html`<div class="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        class="back ${NAV_BUTTON} border border-line text-fg hover:border-mute disabled:border-line/50 disabled:text-mute/50 disabled:hover:border-line/50"
        ?disabled=${stepIndex === 0}
        @click=${this.onBack}
      >
        Back
      </button>
      ${this.renderDots(total, stepIndex)}
      <button
        type="button"
        class="next ${NAV_BUTTON} bg-accent font-semibold text-ink hover:shadow-glow disabled:bg-raised disabled:font-normal disabled:text-mute disabled:hover:shadow-none"
        ?disabled=${stepIndex === total - 1}
        @click=${this.onNext}
      >
        Next
      </button>
    </div>`;
  }

  // the position is already said in words, so the dots are for the eye only
  private renderDots(total: number, shown: number) {
    // long workings get smaller dots so the row stays on one line
    const small = total > 8;
    const size = small ? "h-1.5" : "h-2";
    const on = small ? "w-4 bg-accent" : "w-5 bg-accent";
    const off = small ? "w-1.5 bg-line" : "w-2 bg-line";

    return html`<div
      class="flex min-w-0 flex-nowrap items-center justify-center ${small
        ? "gap-1"
        : "gap-1.5"}"
      aria-hidden="true"
    >
      ${Array.from(
        { length: total },
        (_, index) => html`<span
          class="${size} flex-none rounded-full transition-all duration-200 motion-reduce:transition-none ${index ===
          shown
            ? on
            : off}"
        ></span>`
      )}
    </div>`;
  }

  // the draft can shrink while open, so never point past the last step
  private shownIndex(total: number): number {
    return Math.max(0, Math.min(this.stepIndex, total - 1));
  }

  protected override firstUpdated() {
    // set after this update, not during it (avoids a change-in-update render)
    void this.updateComplete.then(() => {
      this.ready = true;
    });
    this.focusButton(this.steps.length > 1 ? ".next" : ".close");
  }

  private focusButton(selector: string) {
    this.renderRoot.querySelector<HTMLElement>(selector)?.focus();
  }

  private onBack = () => {
    this.goTo(this.shownIndex(this.steps.length) - 1);
  };

  private onNext = () => {
    this.goTo(this.shownIndex(this.steps.length) + 1);
  };

  private async goTo(index: number) {
    const last = this.steps.length - 1;

    this.stepIndex = Math.min(last, Math.max(0, index));
    await this.updateComplete;

    // the pressed button is now disabled at either end, so hand focus over
    if (this.stepIndex === 0) {
      this.focusButton(".next");
    } else if (this.stepIndex === last) {
      this.focusButton(".back");
    }
  }

  private onClose = () => {
    state.stepsOpen = false;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "steps-view": StepsView;
  }
}
