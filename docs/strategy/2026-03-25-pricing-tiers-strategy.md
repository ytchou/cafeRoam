# Pricing & Tier Strategy — CafeRoam (啡遊)

_Generated: 2026-03-25 via /brainstorming (DEV-17)_

---

## 1. Monetization Philosophy

**Phased marketplace monetization** — build demand first, prove engagement, then monetize both sides.

| Phase                        | Timeline           | Revenue Source                    | Trigger to next phase                                                                       |
| ---------------------------- | ------------------ | --------------------------------- | ------------------------------------------------------------------------------------------- |
| **Phase 1: Free**            | Launch → month 2-3 | NT$0                              | Hybrid: time (month 2-3) AND engagement (100+ WAU, 20%+ of free users hitting feature caps) |
| **Phase 2: User Membership** | Month 2-3+         | User subscriptions                | Inbound "Claim" clicks + proactive outreach to 5-10 early-adopter shops                     |
| **Phase 3: Supply-side**     | Month 3-6+         | Shop sponsorships + premium tools | Organic — when shop owners see demonstrable traffic value                                   |

**Phase 1 implementation note:** Feature caps should be **built but not enforced** from launch. Gating infrastructure exists in code, controlled by a feature flag, so Phase 2 activation is a config change — not a code deployment.

---

## 2. User Tiers

### Tier 1: Unauthenticated (Browse-only)

Unauthenticated visitors can browse the directory, map, and shop detail pages. All interactive features (search, lists, check-ins, community feed) are **visible but gated** — attempting to use them prompts a login flow.

| Feature                | Access                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory (list + map) | Full                                                                                                                                               |
| Shop detail            | **Hybrid**: aggregate data public (rating, check-in count, top tags, 1-2 photos). Full reviews, community check-ins, detailed photos require auth. |
| AI semantic search     | Visible, login prompt on submit                                                                                                                    |
| Keyword search         | Visible, login prompt on submit                                                                                                                    |
| Lists                  | Login prompt                                                                                                                                       |
| Check-ins              | Login prompt                                                                                                                                       |
| Polaroid wall          | Login prompt                                                                                                                                       |
| Community feed         | Login prompt                                                                                                                                       |
| Profile                | Login prompt                                                                                                                                       |

**SEO strategy:** Shop detail pages are rich enough for Google indexing — name, address, hours, tags, aggregate rating, representative photos. Landing, directory, map, and shop detail pages are the organic acquisition surface.

### Tier 2: Free (Authenticated)

The default experience for logged-in users. Generous enough to demonstrate value; capped enough to create upgrade motivation.

| Feature              | Access                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Everything in Tier 1 | Full (no restrictions)                                                                                |
| AI semantic search   | **5 per day** — falls back to keyword search with "Upgrade for unlimited AI search" nudge after limit |
| Keyword search       | Unlimited                                                                                             |
| Lists                | **3 max** (existing SPEC cap)                                                                         |
| Check-ins            | Unlimited                                                                                             |
| Polaroid wall        | Full                                                                                                  |
| Reviews              | Full                                                                                                  |
| Community feed       | **Hybrid**: 10-15 full-quality check-in cards per day, then blurred cards with upgrade CTA            |
| Profile              | Basic                                                                                                 |
| Weekly email         | Generic (same content for all free users)                                                             |
| Referral bonus       | **+5 AI searches/month** per referred user who signs up                                               |

### Tier 3: Member (Paid Subscription)

**Pricing:** NT$59/month or NT$449/year (~NT$37/month, 2 months free).

**Positioning:** Soft membership language — "CafeRoam Membership" in marketing. Feature access is the primary sell. Community/shop perks come later when supply-side partnerships exist.

| Feature                      | Access                                                   |
| ---------------------------- | -------------------------------------------------------- |
| Everything in Tier 2         | Full (no restrictions)                                   |
| AI semantic search           | **Unlimited**                                            |
| Lists                        | **Unlimited**                                            |
| Community feed               | **Unlimited**, no blur                                   |
| List export/sharing          | Yes                                                      |
| Personalized recommendations | Yes (AI-powered, based on check-in and search history)   |
| Profile                      | Customizable (bio, featured polaroids)                   |
| Weekly email                 | Personalized (based on preferences and check-in history) |
| Member badge                 | Displayed on profile and community feed check-ins        |

---

## 3. Feature Allocation Matrix

| Feature             | Unauth                                 | Free (auth)          | Member       |
| ------------------- | -------------------------------------- | -------------------- | ------------ |
| Directory browse    | Full                                   | Full                 | Full         |
| Map view            | Full                                   | Full                 | Full         |
| Shop detail         | Hybrid (aggregate public, depth gated) | Full                 | Full         |
| AI semantic search  | Visible, login gated                   | 5/day                | Unlimited    |
| Keyword search      | Visible, login gated                   | Unlimited            | Unlimited    |
| Lists               | Login gated                            | 3 max                | Unlimited    |
| Check-ins           | Login gated                            | Unlimited            | Unlimited    |
| Polaroid wall       | Login gated                            | Full                 | Full         |
| Reviews             | Login gated                            | Full                 | Full         |
| Community feed      | Login gated                            | 10-15/day hybrid     | Unlimited    |
| Follow shops        | Login gated                            | Unlimited            | Unlimited    |
| Profile             | Login gated                            | Basic                | Customizable |
| List export/sharing | —                                      | —                    | Yes          |
| Personalized recs   | —                                      | —                    | Yes          |
| Referral bonuses    | —                                      | +5 searches/referral | n/a          |
| Weekly email        | —                                      | Generic              | Personalized |

---

## 4. Auth Wall Placement

| Route                | Unauth                                 | Free                        | Member       |
| -------------------- | -------------------------------------- | --------------------------- | ------------ |
| `/` (landing)        | Full                                   | Full                        | Full         |
| `/directory`         | Full                                   | Full                        | Full         |
| `/map`               | Full                                   | Full                        | Full         |
| `/shop/[id]`         | Hybrid (aggregate public, depth gated) | Full                        | Full         |
| `/search`            | Visible, login prompt on submit        | 5/day AI, unlimited keyword | Unlimited    |
| `/explore/community` | Login prompt                           | 10-15/day hybrid            | Unlimited    |
| `/lists`             | Login prompt                           | 3 max                       | Unlimited    |
| `/checkin/[shopId]`  | Login prompt                           | Full                        | Full         |
| `/profile`           | Login prompt                           | Basic                       | Customizable |

**SEO-indexed pages:** Landing, directory, map, shop detail (with aggregate data).

---

## 5. Shop Tiers (Rough Outline)

### Shop — Unclaimed (Default)

All shops listed automatically from data pipeline. Basic enriched info. "Is this your shop? Claim it" badge visible on every shop detail page from day 1.

The claim badge serves dual purpose:

1. **Demand signal** — measures inbound interest from shop owners before building owner features
2. **Waitlist** — collects interested owners for proactive outreach

### Shop — Claimed (Free)

Owner verifies ownership (name, email, proof photo) → manual verification at low scale.

| Feature          | Access                                       |
| ---------------- | -------------------------------------------- |
| Update shop info | Hours, description, photos, menu             |
| Analytics        | Basic (views, saves-to-list, check-in count) |
| Review responses | Yes                                          |
| "Verified" badge | Displayed on shop page                       |

### Shop — Sponsored (Future, ~NT$500-1,000/month)

- Featured placement in AI search results
- Highlighted card in directory
- Priority in community feed for their area
- _(Details TBD — separate design session, see [DEV-35](https://linear.app/ytchou/issue/DEV-35/design-shop-sponsored-and-premium-tier-details))_

### Shop — Premium (Future, ~NT$300-1,000/month)

- Full analytics dashboard
- Menu management
- Event/announcement posting
- Review response tools with templates
- _(Details TBD — separate design session, see [DEV-35](https://linear.app/ytchou/issue/DEV-35/design-shop-sponsored-and-premium-tier-details))_

---

## 6. Referral Mechanic

**Goal:** Drive viral signups through the Threads distribution loop.

**Mechanic:** Authenticated free users share a referral link. When a referred user signs up, the referrer gets **+5 AI searches for that month**. Stacks up to a reasonable cap (e.g., 25 bonus/month = 5 referrals).

**Why searches, not features:** Search is the gated capability that drives upgrade motivation. Giving bonus searches is a "taste" — if users consistently hit their cap even with referral bonuses, they're prime conversion candidates.

---

## 7. Revenue Projections (Conservative)

| Phase                   | Monthly Revenue  | Assumptions                                              |
| ----------------------- | ---------------- | -------------------------------------------------------- |
| Phase 1 (months 1-2)    | NT$0             | Free for everyone                                        |
| Phase 2 (months 3-6)    | NT$2,000-10,000  | 30-150 paid members at NT$59/mo. 3-5% conversion of WAU. |
| Phase 3 (months 4-6+)   | +NT$5,000-20,000 | 5-10 sponsored shops at NT$500-1,000/mo                  |
| Steady state (month 6+) | NT$10,000-50,000 | User + shop revenue combined                             |

**Cost baseline (from PRD):** ~NT$1,500-2,400/month (~$50-80 USD).

**Break-even:** ~25-40 paid members (user-side alone covers infrastructure).

**Lifestyle business ceiling (from ASSUMPTIONS.md):** NT$50,000-100,000/month is acceptable. Steady-state projection fits within this range.

---

## 8. Risks & Mitigations

| Risk                                       | Impact                              | Mitigation                                                                                     |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Free tier generous enough that nobody pays | Low membership revenue              | Monitor cap-hit rates. Tighten caps if conversion < 2% after 1 month.                          |
| Membership churn (cancel after 1 month)    | Revenue volatility                  | Annual pricing discount (2 months free). Future member-exclusive shop perks as Phase 3 bridge. |
| Shop owners don't respond to "Claim" badge | Phase 3 delayed                     | Proactive outreach to 5-10 friendly shops. Don't wait for inbound only.                        |
| Search cap frustrates users before "wow"   | Churn at free tier                  | 5/day is generous (most casual users won't hit it). Referral bonus as relief valve.            |
| Phase 2 launched too early (low WAU)       | Near-zero conversion, wasted effort | Hybrid trigger: time AND engagement. Don't flip the switch without 100+ WAU.                   |

---

## 9. Spec & PRD Updates Required

After this strategy is approved and implemented:

- **SPEC.md §9 (Business Rules):** Update role hierarchy to include "member" tier. Update auth wall rules for hybrid shop detail. Add daily search cap logic and fallback-to-keyword behavior. Add community feed hybrid gating (10-15/day + blur).
- **PRD.md §8 (Monetization):** Rewrite from "free for users" to phased monetization model. Update pricing table with user and shop tiers. Add phase transition triggers.
- **PRD.md §7 (Success Metrics):** Add membership conversion rate (3-5% target) and cap-hit rate (20%+ as Phase 2 trigger).

---

## 10. Related Tickets

- **DEV-17** — This design (pricing tiers and user roles)
- **DEV-12** — Community tab (shares auth boundary considerations)
- **DEV-31** — Ads placement and premium search positioning (supply-side details)
- **DEV-30** — GA4 for landing page and unauthenticated traffic monitoring
- **DEV-20** — Shop follower subscriptions (intersects with member perks)
- **[DEV-35](https://linear.app/ytchou/issue/DEV-35/design-shop-sponsored-and-premium-tier-details)** — Shop Sponsored and Shop Premium tier detailed design
