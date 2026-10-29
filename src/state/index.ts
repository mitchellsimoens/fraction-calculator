import { State, property } from "@lit-app/state";
import { emptyDraft } from "../equation/editing";
import { type CalcError, solveDraft } from "../equation/solve";
import type { Draft } from "../equation/types";
import type { Fraction } from "../util/fraction";

export type { CalcError };

class AppState extends State {
  @property({ value: emptyDraft }) draft: Draft;

  // the solved value, set only after "="
  @property({ value: null }) answer: Fraction | null;

  @property({ value: null }) error: CalcError | null;

  @property({ value: false }) stepsOpen: boolean;

  // every key press goes through here: any edit discards the old answer
  public edit(next: Draft): void {
    this.draft = next;
    this.answer = null;
    this.error = null;
    this.stepsOpen = false;
  }

  public solve(): void {
    const solved = solveDraft(this.draft);

    // unfinished drafts are ignored
    if (solved === null) {
      return;
    }

    this.answer = solved.answer;
    this.error = solved.error;
    this.stepsOpen = false;
  }

  public reset(): void {
    this.draft = emptyDraft;
    this.answer = null;
    this.error = null;
    this.stepsOpen = false;
  }
}

export const state = new AppState();
