import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { TwLitElement } from "../../common/TwLitElement";

/**
 * An example element.
 */
@customElement("number-item")
export class NumberItem extends TwLitElement {
  override render() {
    return html`
      <button
        class="flex p-4 items-center justify-center w-full bg-slate-200 hover:bg-slate-400"
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "number-item": NumberItem;
  }
}
