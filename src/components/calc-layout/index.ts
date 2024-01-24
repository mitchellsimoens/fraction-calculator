import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";

import "../number-container";
import "../number-item";
import "../operator-container";
import "../results-container";

/**
 * An example element.
 */
@customElement("calc-layout")
export class CalcLayout extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div
        class="h-full grid grid-areas-layout grid-cols-layout grid-rows-layout"
      >
        <results-container
          class="flex grid-in-results h-16 pb-2"
        ></results-container>

        ${this.renderWholePosition()}
        ${this.renderFractionPosition("numerator")}
        ${this.renderFractionPosition("denominator")}

        <operator-container class="flex grid-in-operators pt-2"></operator-container>
      </div>
    `;
  }

  private renderWholePosition() {
    return html`
      <number-container class="flex grid-in-whole" position="whole">
        <number-item class="flex" slot="beginning" @click=${this.onClear}
          >Clear</number-item
        >
        <number-item class="flex" slot="beginning" @click=${this.onNegative}
          >&plus;/&minus;</number-item
        >
      </number-container>
    `;
  }

  private renderFractionPosition(position: "numerator" | "denominator") {
    return html`<number-container
      class=${classMap({
        "border-t-4": position === "denominator",
        "border-t-red-600": position === "denominator",
        "border-b-4": position === "numerator",
        "border-b-red-600": position === "numerator",
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
    state.negative = !state.negative;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "calc-layout": CalcLayout;
  }
}
