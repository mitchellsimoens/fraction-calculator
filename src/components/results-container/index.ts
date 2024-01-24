import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { OPERATORS_HTML } from "../../util/operators";

/**
 * An example element.
 */
@customElement("results-container")
export class ResultsContainer extends TwLitElement {
  state = new StateController(this, state);

  override render() {
    return html`
      <div class="p-4 w-full text-right bg-slate-100">
        ${this.renderLeft()} ${unsafeHTML(this.renderOperator())}
        ${this.renderRight()}
      </div>
    `;
  }

  private renderLeft(): string {
    let { left } = state;

    if (!left) {
      return "0";
    }

    if (state.negative) {
      left = `-${left}`;
    }

    return left;
  }

  private renderOperator(): string {
    let { operator } = state;

    if (operator == null) {
      return "";
    }

    return OPERATORS_HTML[operator];
  }

  private renderRight(): string {
    return state.right;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "results-container": ResultsContainer;
  }
}
