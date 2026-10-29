import { StateController } from "@lit-app/state";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { TwLitElement } from "../../common/TwLitElement";
import { state } from "../../state";
import { deleteFrom, emptyDraft, typeInto } from "../../equation/editing";
import type { Draft } from "../../equation/types";

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
          "auto-rows-fr": true,
          "gap-3": true,
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
          variant="fn"
          @click=${this.onDeleteClick}
          >del</number-item
        >
      </div>
    `;
  }

  // typing right after "=" begins a fresh equation
  private get base(): Draft {
    return state.answer ? emptyDraft : state.draft;
  }

  private onDeleteClick = () => {
    state.edit(deleteFrom(this.base, this.position));
  };

  private onNumberClick = (value: string) => () => {
    state.edit(typeInto(this.base, this.position, value));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "number-container": NumberContainer;
  }
}
