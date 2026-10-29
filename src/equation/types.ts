import type { OPERATORS } from "../util/operators";

export interface Term {
  readonly text: string;
  readonly negative: boolean;
}

// invariant: terms.length >= 1 and operators.length === terms.length - 1
export interface Draft {
  readonly terms: readonly Term[];
  readonly operators: readonly OPERATORS[];
}

export type Part = "whole" | "numerator" | "denominator";
