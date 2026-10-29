import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { TwLitElement } from "../../common/TwLitElement";
import { carryForward, toggleSign } from "../../equation/editing";
import { state } from "../../state";

import "../number-container";
import "../number-item";
import "../operator-container";
import "../results-container";
import "../steps-view";

/**
 * The calculator: the display on top and the keypad below, or the
 * step-by-step working in the keypad's place while it is open.
 */
@customElement("calc-layout")
export class CalcLayout extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div
        class="flex-1 grid grid-areas-layout grid-cols-layout grid-rows-layout"
      >
        <results-container
          class="flex grid-in-results"
        ></results-container>

        ${state.stepsOpen ? this.renderSteps() : this.renderKeypad()}
      </div>
    `;
  }

  // while open, the steps take the whole keypad area
  private renderSteps() {
    return html`<steps-view
      class="flex min-h-0 flex-col [grid-area:2/1/5/3]"
    ></steps-view>`;
  }

  private renderKeypad() {
    return html`
      ${this.renderWholePosition()}
      ${this.renderFractionPosition("numerator")}
      ${this.renderFractionPosition("denominator")}

      <operator-container class="flex grid-in-operators pt-2"></operator-container>
    `;
  }

  private renderWholePosition() {
    return html`
      <number-container class="flex grid-in-whole" position="whole">
        <number-item class="flex" slot="beginning" variant="fn" @click=${this.onClear}
          >Clear</number-item
        >
        <number-item class="flex" slot="beginning" variant="fn" @click=${this.onNegative}
          >&plus;/&minus;</number-item
        >
      </number-container>
    `;
  }

  private renderFractionPosition(position: "numerator" | "denominator") {
    return html`<number-container
      class=${classMap({
        // the glowing fraction bar between the two keypads
        "border-b-2": position === "numerator",
        "border-accent/70": position === "numerator",
        flex: true,
        [`grid-in-${position}`]: true,
      })}
      position=${position}
    ></number-container>`;
  }

  private onClear = () => {
    state.reset();
  };

  private onNegative = () => {
    // after "=", the sign belongs to the answer, carried into a new equation
    const base = state.answer ? carryForward(state.answer) : state.draft;

    state.edit(toggleSign(base));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "calc-layout": CalcLayout;
  }
}
