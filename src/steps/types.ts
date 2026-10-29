import type { OPERATORS } from "../util/operators";

/**
 * A mixed number exactly as it appears in a step. It is never auto-reduced,
 * so `1 5/4` and `6 325/260` can be shown as they are. The sign covers the
 * whole value; whole, numerator and denominator are non-negative integers.
 */
export interface Mixed {
  readonly negative: boolean;
  readonly whole: number;
  readonly numerator: number;
  readonly denominator: number;
}

export type Token =
  | {
      readonly kind: "value";
      readonly value: Mixed;
      readonly multiplier?: number;
      readonly highlight?: boolean;
    }
  | { readonly kind: "operator"; readonly operator: OPERATORS };

export type StepId =
  | "signs"
  | "common-denominator"
  | "borrow"
  | "combine"
  | "carry"
  | "simplify"
  | "order"
  | "improper"
  | "reciprocal"
  | "multiply";

export interface Step {
  readonly id: StepId;
  /** short plain sentence a child can read */
  readonly caption: string;
  /** the equation as it stands after this step */
  readonly tokens: readonly Token[];
  /** combine only: the arrow-down row, e.g. "6 − 2 = 4" */
  readonly wholes?: string;
  /** simplify only: set when something was reduced */
  readonly divisor?: number;
}
