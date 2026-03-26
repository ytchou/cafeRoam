# Shop Owner Value Proposition — Free Claimed Tier

_Generated: 2026-03-26 via /brainstorming (DEV-19)_

---

## 1. Problem & Goal

Before building a shop-claim flow, we need to answer: **why would a shop owner bother claiming their page on CafeRoam?**

Claiming adds friction — an owner must manage another platform. Unless the benefit clearly outweighs that cost, adoption will be near-zero.

**Goal:** Define the free Claimed tier value proposition compellingly enough that shop owners proactively claim their page. Paid tiers (Sponsored, Premium) are deferred to DEV-35 and designed after the free tier proves adoption.

---

## 2. Key Decisions

| Decision              | Choice                                          | Rationale                                                                           |
| --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Anchor value prop     | Customer insights + distribution/reach, bundled | Insights = unique data only CafeRoam has; distribution = works at any traffic level |
| Social sync (Zernio)  | Backlogged (DEV-44)                             | Shop owners managing IG + GBP + LINE OA don't feel enough pain from 2-3 platforms   |
| Verification          | Manual review (name + email + proof photo)      | Appropriate for <50 claims; no engineering overhead                                 |
| Follower interactions | Future premium                                  | Count visible to claimed shops; messaging/push deferred                             |
| Paid tier design      | Deferred to DEV-35                              | Don't over-design before real adoption data exists                                  |

---

## 3. Positioning

**One-liner for shop owners:**

> 你的咖啡廳已經在 CafeRoam 上了。認領你的頁面，看看誰在找你、為什麼找你。
> ("Your coffee shop is already on CafeRoam. Claim your page to see who's looking for you and why.")

**Anchor value props (in priority order):**

1. **Customer insights** — search terms, check-in activity, visitor-associated tags
2. **Distribution/reach** — owner-curated tags improve how the shop appears in semantic search results
3. **Info control** — correct the listing, add photos, update hours
4. **Trust signal** — Verified badge on shop page and search result cards

---

## 4. Free Claimed Tier — Features

| Feature                       | Description                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Edit shop info**            | Hours, description, photos (up to 10 owner photos), menu highlights                                   |
| **Verified badge**            | Displayed on shop detail page header + search result cards                                            |
| **Basic analytics dashboard** | Page views, saves-to-list count, check-in count, follower count. Rolling 30-day view.                 |
| **Search terms report**       | Top 5-10 semantic search queries that surfaced this shop in results. Updated weekly.                  |
| **Community pulse**           | Recent check-in activity (anonymized). Trending tags visitors associate with the shop.                |
| **Comparison context**        | "Your shop ranks #N in [district] for [attribute]" — relative positioning, top 3 attributes.          |
| **Owner-curated tags**        | Add/confirm taxonomy tags (e.g., 適合遠端工作, 自家烘焙單品). Max 10 tags. Feeds into search quality. |
| **Review responses**          | Reply to user reviews / check-in notes                                                                |
| **Follower count**            | Visible in dashboard (follower messaging is future premium)                                           |

---

## 5. Claim Flow

```
1. Shop owner sees "Is this your shop? Claim it" badge on any shop detail page
2. Clicks → claim form:
   - Name (owner or manager)
   - Email
   - Role (owner / manager / staff)
   - Proof photo (photo at the shop, business card, menu with shop name, or Google Business screenshot)
3. Submits → "We'll verify within 48 hours" confirmation
4. Manual review: verify proof photo matches shop → send approval email
5. Owner receives email with dashboard setup link
6. Dashboard unlocked: edit info, view analytics, curate tags
```

**Verification SLA:** 48 hours.

---

## 6. Shop Owner Dashboard — Sections

| Section             | Contents                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Overview**        | Page views (30d), check-ins (30d), followers, saves-to-list                                                             |
| **Search Insights** | Top queries that surfaced this shop. Updated weekly from search logs.                                                   |
| **Community Pulse** | Recent check-in activity (anonymized: "A user checked in 2 days ago with tags: 手沖咖啡, 安靜"). Trending visitor tags. |
| **Your Ranking**    | "You rank #N in [district] for [top attributes]". Relative positioning only — no competitor data.                       |
| **Shop Info**       | Edit hours, description, photos, menu highlights                                                                        |
| **Tags**            | Owner-curated taxonomy tags (add/confirm/remove, max 10)                                                                |
| **Reviews**         | View and respond to user reviews                                                                                        |

---

## 7. Empty State Strategy

Every empty state must include a concrete action, not just "nothing here yet."

| Metric           | Empty state                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| 0 page views     | "Your page is live! Share your CafeRoam link on Instagram or LINE to start driving views." + copyable link |
| 0 check-ins      | "No check-ins yet. Check-ins happen when CafeRoam users visit and share their experience."                 |
| 0 search queries | "Once your shop appears in search results, you'll see what people searched for here."                      |
| No ranking data  | "Rankings appear once your district has enough search activity."                                           |

---

## 8. Data Sources & Privacy

| Insight              | Source                                                        | Privacy                                           |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Page views           | PostHog page view events on `/shop/[id]`                      | Aggregate only                                    |
| Saves-to-list        | `list_items` table count by shop_id                           | Aggregate only                                    |
| Check-in count       | `check_ins` table count by shop_id                            | Aggregate only                                    |
| Follower count       | `shop_followers` table count                                  | Aggregate only                                    |
| Search terms         | Search query logs where shop appeared in top-N results        | Queries anonymized, no user attribution           |
| Community pulse tags | Tags from check-in notes + taxonomy matches                   | Anonymized — no usernames, just tags + timestamps |
| Ranking              | Computed from search frequency + check-in volume per district | Relative rank only                                |

**PDPA compliance:** Shop owners never see individual user data — no usernames, emails, or profiles. All metrics are aggregate or anonymized.

---

## 9. Owner-Curated Tags — Rules

- Max 10 tags per shop
- Tags must come from CafeRoam's existing taxonomy (no free-form input)
- Owner tags weighted slightly higher in semantic search (ground-truth signal)
- If owner tags conflict significantly with visitor check-in tags (e.g., owner says "quiet," 80% of users tag "lively"), surface a soft advisory in the dashboard — don't auto-override
- Owner-confirmed tags are publicly visible on shop detail with a "Shop owner confirmed" indicator

---

## 10. Natural Upgrade Path (Free → Paid — Preview Only)

The free claimed tier is designed to generate demand for premium features via visible but gated data. These are not built now — they are the hooks that DEV-35 will design.

| Free tier shows...                                | Upgrade unlocks...                                    |
| ------------------------------------------------- | ----------------------------------------------------- |
| Follower count: 47                                | Message followers directly                            |
| "23 people searched '安靜工作空間' and found you" | Rank higher for that query (Sponsored)                |
| 340 page views this month                         | Visitor demographics + conversion detail (Premium)    |
| Trending visitor tags                             | Run targeted promotions to searchers using those tags |

---

## 11. Success Metrics

| Metric                             | Target                                      | When to measure                 |
| ---------------------------------- | ------------------------------------------- | ------------------------------- |
| Claim badge click rate             | 5%+ of shop detail page views               | Month 1-2 after badge goes live |
| Submission → approval rate         | 80%+                                        | First 20 claims                 |
| Claimed shop dashboard return rate | 40%+ return within 30 days                  | Month 2-3                       |
| Owner tag additions                | 70%+ of claimed shops add ≥3 tags           | First 30 days post-claim        |
| Upgrade interest signals           | Track CTA clicks on locked premium features | Month 3+                        |

---

## 12. Out of Scope (for Now)

- Paid shop tiers (Sponsored, Premium) — DEV-35
- Follower messaging / push notifications — future premium
- Social sync / cross-platform posting — DEV-44 (backlog)
- Event/announcement posting — future premium
- Structured menu editor — future premium
- CRM / visitor email collection — future premium (PDPA implications)

---

## 13. Related Tickets

| Ticket     | Relationship                                                                |
| ---------- | --------------------------------------------------------------------------- |
| **DEV-19** | This design (strategy exploration)                                          |
| **DEV-35** | Paid shop tiers (Sponsored + Premium) — builds on this free tier design     |
| **DEV-44** | Social sync / Zernio — backlogged from this session                         |
| **DEV-20** | Shop follower subscriptions (follower count used in claimed tier analytics) |
| **DEV-17** | User pricing tiers (defines the shop tier framework this extends)           |
