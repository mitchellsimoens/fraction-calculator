import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { carryForward, pressOperator } from "../../equation/editing";
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
    const base = state.answer ? carryForward(state.answer) : state.draft;

    state.edit(pressOperator(base, operator));
  };

  onEqual = () => {
    state.solve();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "operator-container": OperatorContainer;
  }
}
