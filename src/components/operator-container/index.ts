import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { numberToString } from "../../util/numberToString";
import { OPERATORS, OPERATORS_HTML } from "../../util/operators";
import { splitValue } from "../../util/regex";

import "../number-item";

/**
 * An example element.
 */
@customElement("operator-container")
export class OperatorContainer extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div class="flex gap-4 w-full">
        ${this.renderButton(OPERATORS.PLUS)}
        ${this.renderButton(OPERATORS.MINUS)}
        ${this.renderButton(OPERATORS.MULTIPLY)}
        ${this.renderButton(OPERATORS.DIVIDE)}
        <number-item class="flex flex-1" @click=${this.onEqual}
          >&equals;</number-item
        >
      </div>
    `;
  }

  private renderButton(operator: OPERATORS) {
    return html`
      <number-item class="flex flex-1" @click=${this.onClick(operator)}
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

    const leftFloat = this.fractionToFloat(left);
    const rightFloat = this.fractionToFloat(right);
    let rawValue = this.doMath(leftFloat, rightFloat);

    state.reset();

    if (rawValue < 0) {
      // value always needs to be positive as
      // the negative state value will add
      // a negative sign
      rawValue *= -1;

      state.negative = true;
    }

    state.left = numberToString(rawValue);
  };

  private fractionToFloat(value: string): number {
    let [, whole, numerator, denominator] = splitValue(value);
    let final: number;

    if (whole) {
      final = Number(whole);
    } else {
      final = 0;
    }

    if (numerator && denominator) {
      return final + Number(numerator) / Number(denominator);
    }

    return final;
  }

  private doMath(left: number, right: number): number {
    if (state.negative) {
      left *= -1;
    }

    let value: number;

    switch (state.operator) {
      case OPERATORS.DIVIDE:
        value = left / right;
        break;

      case OPERATORS.MINUS:
        value = left - right;
        break;

      case OPERATORS.MULTIPLY:
        value = left * right;
        break;

      case OPERATORS.PLUS:
        value = left + right;
        break;
    }

    return value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "operator-container": OperatorContainer;
  }
}
