import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { TwLitElement } from "../../common/TwLitElement";

type Variant = "key" | "fn" | "op" | "equals";

/**
 * A calculator button. The variant sets its role: digits are quiet
 * squares, functions are outlined, operators are pills, equals is solid.
 */
@customElement("number-item")
export class NumberItem extends TwLitElement {
  @property()
  variant: Variant = "key";

  override render() {
    const { variant } = this;

    return html`
      <button
        class=${classMap({
          flex: true,
          "w-full": true,
          "items-center": true,
          "justify-center": true,
          "py-2": true,
          "min-h-[2.75rem]": true,
          "font-sans": true,
          "select-none": true,
          "touch-manipulation": true,
          "transition duration-150": true,
          "motion-reduce:transition-none": true,
          "active:scale-95": true,
          "focus-visible:outline-none": true,
          "focus-visible:ring-2": true,
          "focus-visible:ring-accent": true,
          "rounded-2xl bg-panel border border-line text-fg text-xl font-light hover:bg-raised hover:border-mute":
            variant === "key",
          "rounded-xl border border-line text-mute text-base hover:text-fg hover:border-mute":
            variant === "fn",
          "min-h-[3.25rem] rounded-full bg-panel border border-line text-accent text-2xl hover:border-accent":
            variant === "op",
          "min-h-[3.25rem] rounded-full bg-accent text-ink text-2xl font-semibold hover:shadow-glow":
            variant === "equals",
        })}
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
