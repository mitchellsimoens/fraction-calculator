import { State, property } from "@lit-app/state";
import { OPERATORS } from "../util/operators";

class AppState extends State {
  @property({ value: "" }) left: string;

  @property({ value: false }) negative: boolean;

  @property({ value: null }) operator: OPERATORS;

  @property({ value: "" }) right: string;

  public reset(): void {
    this.left = "";
    this.negative = false;
    this.operator = null;
    this.right = "";
  }
}

export const state = new AppState();
