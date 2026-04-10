# AbortController fetch calls need 2-arg assertion in tests

**Date:** 2026-04-10
**Context:** DEV-314 search bar revamp — useSearchSuggestions hook tests

**What happened:** Adding an AbortController to a fetch call changes its signature from `fetch(url)` to `fetch(url, { signal })`. Tests using `toHaveBeenCalledWith(url)` (single-arg) silently fail because Vitest's `toHaveBeenCalledWith` requires an exact match on all arguments.

**Root cause:** The test was written when fetch had no options. Adding AbortController (a correctness fix) broke the assertion without a TypeScript compile error.

**Prevention:** Whenever adding `{ signal }`, `{ headers }`, or any options object to a fetch call, immediately update the corresponding test assertion to `toHaveBeenCalledWith(url, expect.objectContaining({ signal: expect.any(AbortSignal) }))`.
