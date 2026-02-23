# Inline types silently diverge from canonical domain types

**Date:** 2026-02-23
**Context:** Project setup — provider interfaces written in lib/providers/llm/llm.interface.ts

## What happened

`EnrichmentResult.tags` was inlined as `Array<{ id: string; dimension: string; ... }>` instead of importing `TaxonomyTag` from `@/lib/types`. The inline used `dimension: string`, while the canonical `TaxonomyTag` has `dimension: TaxonomyDimension` (a constrained union). TypeScript did not catch this because structural compatibility was satisfied (string is wider than the union, so the inline type accepted more values than intended).

## Root cause

When writing provider interfaces, it's tempting to inline shapes from memory to avoid import cycles. This produces a structural duplicate that TypeScript sees as compatible but which is semantically incorrect.

## Prevention

- Always import domain types from `@/lib/types` into provider interfaces — never inline shapes.
- When a provider returns a type that exists in the domain model, verify the field types match exactly (not just structurally).
- Code review checklist: flag any `Array<{ ... }>` inline in a provider interface that looks like an existing domain type.
