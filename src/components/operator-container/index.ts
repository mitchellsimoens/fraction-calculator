import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { calculate, formatFraction, parseFraction } from "../../util/fraction";
import { OPERATORS, OPERATORS_HTML } from "../../util/operators";

import "../number-item";

/**
 * An example element.
 */
@customElement("operator-container")
export class OperatorContainer extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div class="flex gap-3 w-full p-2">
        ${this.renderButton(OPERATORS.PLUS)}
        ${this.renderButton(OPERATORS.MINUS)}
        ${this.renderButton(OPERATORS.MULTIPLY)}
        ${this.renderButton(OPERATORS.DIVIDE)}
        <number-item
          class="flex flex-1"
          variant="equals"
          @click=${this.onEqual}
          >&equals;</number-item
        >
      </div>
    `;
  }

  private renderButton(operator: OPERATORS) {
    return html`
      <number-item
        class="flex flex-1"
        variant="op"
        @click=${this.onClick(operator)}
        >${unsafeHTML(OPERATORS_HTML[operator])}</number-item
      >
    `;
  }

  onClick = (operator: OPERATORS) => () => {
    this.onEqual();

    state.operator = operator;
  };

  onEqual = () => {
    const { left, operator, right } = state;

    if (!left || operator == null || !right) {
      return;
    }

    const leftFraction = parseFraction(left, state.negative);
    const rightFraction = parseFraction(right);

    if (!leftFraction || !rightFraction) {
      return;
    }

    const result = calculate(leftFraction, operator, rightFraction);

    if (!result) {
      // division by zero: leave the entered values alone
      return;
    }

    const { text, negative } = formatFraction(result);

    state.reset();

    // the text is always positive as the negative state
    // value will add a negative sign
    state.negative = negative;
    state.left = text;
    state.showingResult = true;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "operator-container": OperatorContainer;
  }
}
