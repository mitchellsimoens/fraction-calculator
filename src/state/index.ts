import { State, property } from "@lit-app/state";
import { OPERATORS } from "../util/operators";

class AppState extends State {
  @property({ value: "" }) left: string;

  @property({ value: false }) negative: boolean;

  @property({ value: null }) operator: OPERATORS;

  @property({ value: "" }) right: string;

  // true while `left` holds the result of a calculation
  @property({ value: false }) showingResult: boolean;

  public reset(): void {
    this.left = "";
    this.negative = false;
    this.operator = null;
    this.right = "";
    this.showingResult = false;
  }
}

export const state = new AppState();
