import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { splitValue } from "../../util/regex";

import "../number-item";

/**
 * An example element.
 */
@customElement("number-container")
export class NumberContainer extends TwLitElement {
  protected state = new StateController(this, state);

  @property()
  position: "denominator" | "numerator" | "whole";

  override render() {
    const { position } = this;

    return html`
      <div
        class=${classMap({
          grid: true,
          "gap-4": true,
          "p-2": true,
          "w-full": true,
          "grid-cols-2": position === "whole",
          "grid-cols-3": position !== "whole",
        })}
      >
        <slot name="beginning"></slot>
        <number-item class="flex" @click=${this.onNumberClick("1")}
          >1</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("2")}
          >2</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("3")}
          >3</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("4")}
          >4</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("5")}
          >5</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("6")}
          >6</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("7")}
          >7</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("8")}
          >8</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("9")}
          >9</number-item
        >
        <number-item class="flex" @click=${this.onNumberClick("0")}
          >0</number-item
        >
        <number-item
          class="flex col-span-2"
          @click=${this.onDeleteClick}
          >del</number-item
        >
      </div>
    `;
  }

  private get whichStateValue() {
    return state.operator == null ? "left" : "right";
  }

  private onDeleteClick = () => {
    const { whichStateValue } = this;
    const values = splitValue(state[whichStateValue]);

    switch (this.position) {
      case "denominator":
        values[3] = values[3].substring(0, values[3].length - 1);
        break;

      case "numerator":
        values[2] = values[2].substring(0, values[2].length - 1);
        break;

      case "whole":
        values[1] = values[1].substring(0, values[1].length - 1);
        break;
    }

    state[whichStateValue] = this.formatFinalValue(values);
  };

  private onNumberClick = (value: string) => () => {
    const { whichStateValue } = this;
    const values = splitValue(state[whichStateValue]);

    switch (this.position) {
      case "denominator":
        values[3] += value;
        break;

      case "numerator":
        values[2] += value;
        break;

      case "whole":
        values[1] += value;
        break;
    }

    state[whichStateValue] = this.formatFinalValue(values);
  };

  private formatFinalValue(values: string[]): string {
    const fraction = values[2] || values[3] ? ` ${values[2]}/${values[3]}` : "";

    return `${values[1]}${fraction}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "number-container": NumberContainer;
  }
}
