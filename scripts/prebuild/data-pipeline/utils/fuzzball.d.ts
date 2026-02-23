declare module 'fuzzball' {
  export interface FuzzOptions {
    force_ascii?: boolean;
    full_process?: boolean;
  }

  /** Simple ratio (Levenshtein) of two strings, 0–100 */
  export function ratio(s1: string, s2: string, options?: FuzzOptions): number;

  /** Partial ratio (best substring match), 0–100 */
  export function partial_ratio(
    s1: string,
    s2: string,
    options?: FuzzOptions
  ): number;

  /** Token sort ratio (sorts tokens then compares), 0–100 */
  export function token_sort_ratio(
    s1: string,
    s2: string,
    options?: FuzzOptions
  ): number;

  /**
   * Token set ratio: computes intersection of token sets, then scores the best
   * of three combinations. Handles reordering and subset matches.
   *
   * IMPORTANT: Always pass `{ force_ascii: false, full_process: false }` to
   * preserve CJK characters. The default `force_ascii: true` strips all
   * non-ASCII characters, destroying CJK input.
   *
   * Returns 0–100.
   */
  export function token_set_ratio(
    s1: string,
    s2: string,
    options?: FuzzOptions
  ): number;

  export default {
    ratio,
    partial_ratio,
    token_sort_ratio,
    token_set_ratio,
  };
}
