# ADR: Supabase Cloud Region — Tokyo over Singapore

Date: 2026-03-29

## Decision

Use `ap-northeast-1` (Tokyo) for all Supabase cloud projects (staging and production).

## Context

SPEC.md originally specified `ap-southeast-1` (Singapore) as the closest region to Taiwan. When setting up the staging project, we re-evaluated latency to Taiwan users.

## Alternatives Considered

- **Singapore (ap-southeast-1)**: ~40ms to Taiwan. Originally chosen as "closest to Taiwan" but this was based on geographic proximity, not network latency.
- **Tokyo (ap-northeast-1)**: ~20ms to Taiwan. Better submarine cable connectivity to Taiwan results in lower latency despite slightly greater geographic distance.

## Rationale

Tokyo has better network infrastructure connectivity to Taiwan (direct submarine cables) resulting in roughly half the latency of Singapore. For a mobile-first app where perceived responsiveness matters, the ~20ms difference compounds across multiple API calls per page load.

## Consequences

- Advantage: Lower latency for Taiwan users (~20ms vs ~40ms)
- Advantage: Japan data residency laws are well-established
- Disadvantage: None significant — pricing and features are identical across regions
