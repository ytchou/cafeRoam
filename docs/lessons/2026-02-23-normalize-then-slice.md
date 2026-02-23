# Match on normalized string — always slice from the same string

**Date:** 2026-02-23
**Context:** chain-dictionary.ts decomposeBrandBranch, during code review of name matching upgrade

**What happened:** `decomposeBrandBranch` matched aliases by comparing `normalized.startsWith(normalizedAlias)`, but then extracted the branch by slicing the _raw_ `name` at `alias.length`. When a shorter alias matched before a longer one (e.g., "Louisa" length 6 before "Louisa Coffee" length 13), the branch slice included extra tokens ("coffee 中山店" instead of "中山店").

**Root cause:** Matched on one string (normalized), sliced from a different string (raw). The two strings have different lengths when the input uses different casing or alias variants from what the dictionary stores.

**Prevention:** When you match using a normalized/transformed string, always compute the slice offset and perform the slice on that _same_ string. Never cross-reference offsets between the normalized and raw versions.
