import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { TwLitElement } from "../common/TwLitElement";

import "../components/calc-layout";

@customElement("x-index-page")
export class IndexPage extends TwLitElement {
  render(): TemplateResult {
    return html`
      <div
        class="mx-auto flex min-h-[100dvh] max-w-md flex-col px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <calc-layout class="flex flex-1 flex-col"></calc-layout>
      </div>
    `;
  }
}
