import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { TwLitElement } from "../common/TwLitElement";

import "../components/calc-layout";

@customElement("x-index-page")
export class IndexPage extends TwLitElement {
  render(): TemplateResult {
    return html`
      <div class="container h-screen py-4">
        <calc-layout class="block h-full"></calc-layout>
      </div>
    `;
  }
}
