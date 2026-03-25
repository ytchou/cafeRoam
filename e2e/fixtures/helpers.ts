/**
 * Type-safe alternative to unsafe [0] array indexing.
 *
 * Overload 1: untyped (any[]) arrays — returns any so callers using response.json()
 *             can access properties without type assertions.
 * Overload 2: typed arrays — returns T | undefined for explicit type narrowing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function first(arr: any[]): any;
export function first<T>(arr: T[]): T | undefined;
export function first(arr: unknown[]): unknown {
  return arr[0];
}
