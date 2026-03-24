# State Machine Guards: Allowlist Over Exclusion
**Date:** 2026-03-24
**Context:** DEV-6 live-shop guard in generate_embedding handler

**What happened:** The live-shop guard was written as `is_live = status != "live"` — advance the pipeline for anything that isn't live. This would also advance shops in `publishing` state, causing duplicate PUBLISH_SHOP jobs on retry.

**Root cause:** Negative guards (`!= X`) are safe only when the state space is binary. When it's an enum with 8+ values, a negative guard includes every unknown or unexpected value.

**Prevention:** For state machine transitions, always use an allowlist of states that *should* advance, not an exclusion of states that shouldn't:

```python
# Wrong (negative guard — includes "publishing", "failed", "pending", etc.):
if shop["processing_status"] != "live":
    advance_pipeline()

# Correct (allowlist — only advance from known safe states):
if shop["processing_status"] in {"embedding", "enriched"}:
    advance_pipeline()
```

The allowlist pattern is safe-by-default: any status not explicitly listed is treated as "do not advance," which is always the correct fallback for unexpected states.
