# ADR: Bundled Signup Consent for Owner Analytics (No Legitimate Interest Under Taiwan PDPA)

Date: 2026-04-03

## Decision

Use bundled signup consent (Art. 19§5) with explicit analytics-sharing disclosure as the legal basis for sharing aggregate data with shop owners, rather than relying on a separate opt-in checkbox or a "legitimate interest" justification.

## Context

DEV-37 required determining the legal basis for sharing platform analytics with verified shop owners under Taiwan's PDPA. During analysis, we discovered that Taiwan PDPA **does not include "legitimate interest"** as a legal basis for non-government entities (unlike GDPR Art. 6(1)(f)). Art. 19 provides an exhaustive enumerated list: law, contract, published data, academic research, consent, or public interest.

This means the common approach of claiming "legitimate interest" for aggregate analytics sharing is not available under Taiwanese law. A consent-based approach is required.

CafeRoam's core principle is that shop owners never see individual user data — all analytics are aggregate and non-attributable. With k-anonymity (k=10) enforcement on demographic breakdowns, truly anonymized aggregates fall outside PDPA scope entirely. However, to be conservative (this document is the primary legal guidance without external legal counsel), we disclose analytics sharing in the signup consent regardless.

## Alternatives Considered

- **Separate opt-in checkbox at signup**: Dedicated checkbox for "Allow anonymized usage data to be shared with shop owners." Rejected: adds friction to signup without meaningful legal benefit — Taiwan PDPA requires informed consent, not a specific UI element. A clearly worded bundled consent satisfies Art. 19§5.

- **Progressive/just-in-time consent**: No analytics consent at signup; show consent prompt on first interaction with a claimed shop. Rejected: creates a fragmented consent experience and risks missing consent for passive data (page views, search appearances) collected before the user ever interacts with a claimed shop.

- **No additional consent (anonymization-only defense)**: Argue that all aggregate data is outside PDPA scope by definition, so no consent is needed. Rejected: while legally defensible for pure counts, this is too aggressive as primary legal guidance without a lawyer. Adding the disclosure to signup consent costs nothing and provides a safety net.

## Rationale

Bundled consent is the right fit because:

1. It satisfies Taiwan PDPA Art. 19§5 — the data subject is informed of the purpose at collection time
2. It preserves a clean signup UX (no extra checkbox or modal)
3. The disclosure is specific enough to meet Art. 20 purpose limitation requirements
4. Combined with k-anonymity enforcement, it provides defense in depth: even if someone challenged the consent, the data shared is arguably not "personal data" under Art. 2
5. Consent withdrawal is available in profile settings, satisfying the right to withdraw

## Consequences

- **Advantage**: Simple UX, legally sufficient, conservative safety net over pure anonymization defense
- **Advantage**: Consent version tracking allows future consent text updates without re-consent friction
- **Disadvantage**: If consent text changes significantly, existing users may need to re-consent (minor UX disruption)
- **Disadvantage**: Bundled consent is slightly less defensible than a dedicated checkbox if challenged — but the aggregate-only data principle and k-anonymity make a challenge unlikely
- **Update (2026-04-05, DEV-89)**: Commercial analytics audit confirmed that bundled consent is sufficient for paid tiers as well. The Premium tier subscription gates dashboard access (B2B pricing), not user data processing — the data processing purpose is identical to free analytics sharing. No stronger consent basis or separate disclosure is needed. See `docs/legal/2026-04-03-pdpa-owner-analytics-compliance.md` Section 10.
