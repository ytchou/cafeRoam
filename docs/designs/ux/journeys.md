# CafeRoam — Journey Maps

> Generated: 2026-03-02
> One journey per persona for their primary job-to-be-done.
> ⚠ = friction point / abandonment risk

---

## Persona 1: Yuki — Solo Discovery

**Job:** Find a coffee shop that fits today's mood on the way there.

**Trigger** (two common variants)
- A: Deciding where to work remotely — opens phone on MRT, ~10 min to destination
- B: Craving a specific food item ("where has basque cake near me?") — no way to search this on Google Maps today

**Discovery**
1. Opens CafeRoam
2. Types in plain language: "quiet pour-over near Zhongshan, outlets" OR "where has basque cake?"
3. ⚠ Waits for results to load on mobile — slow first paint = back to Google Maps
4. Sees 3 ranked results with key attributes visible
5. Taps a result to view shop detail

**Decision**
6. ⚠ "Is this still open / up to date?" — data freshness is the #1 trust blocker
7. Sees a recent check-in photo confirming the shop is active
8. Decides to go

**Outcome**
9. Arrives, has a good work session
10. ⚠ Forgets to check in — if the flow is buried, most users won't bother
11. If prompted: uploads photo, earns stamp, logs visit

**Key friction:** Search load speed on mobile · Data freshness doubt · Check-in discoverability · Menu data completeness (food item search quality bounded by enrichment pipeline)

---

## Persona 2: Jason — Social Coordination

**Job:** Find a group-friendly spot and share a convincing recommendation fast.

**Trigger**
- Group chat asks "where Saturday?"
- Jason volunteers to find somewhere

**Discovery**
1. Opens CafeRoam
2. Filters by mode "social", area "Da'an"
3. ⚠ "Social" label is ambiguous — unclear what it means vs. "rest" or "work"
4. Browses list view, sees 4 options with seating info
5. Taps 2 options to compare

**Decision**
6. ⚠ No easy way to share two options for group input (lists are private in V1)
7. Picks one, copies the CafeRoam shop URL
8. Pastes in group chat with a one-line description
9. Group agrees quickly — link looks credible, not a random Google Maps pin

**Outcome**
10. Group visits, experience is good
11. ⚠ Jason doesn't check in — the social coordinator uses CafeRoam as a tool, not a tracker
12. Mentions CafeRoam when friends ask how he found it → organic word of mouth

**Key friction:** "Social" mode label clarity · No multi-option sharing in V1 · Check-in habit doesn't form for this persona

---

## Persona 3: Mei-Ling — Enthusiast Collection

**Job:** Discover a specialty coffee shop she hasn't tried, visit it, and log it.

**Trigger**
- Finished work early, wants to explore
- Wants somewhere new — not a repeat

**Discovery**
1. Opens CafeRoam
2. Types in plain language: "Yirgacheffe single origin" or "has hojicha latte and basque cake"
3. ⚠ Food and menu item search quality is directly bounded by enrichment pipeline depth — if the data isn't there, results fail
4. Sees 2 results — one stamped (already visited), one new
5. ⚠ No "exclude already visited" filter — she has to identify new shops manually

**Decision**
6. Taps the new shop, reads detail page
7. Checks menu info and opening hours
8. Decides to go

**Core Action**
9. Visits, orders the Yirgacheffe, great experience
10. Opens CafeRoam immediately — check-in is already habit for her
11. Uploads photo, adds a note about the coffee
12. Earns unique stamp for this shop
13. Adds shop to her "specialty only" list

**Outcome**
14. Stamp collection grows
15. ⚠ Stamp display in V1 profile is functional but not visually satisfying — risks killing the collection habit
16. Shares the shop link in a coffee community thread on Threads → distribution

**Key friction:** Enrichment data depth · No "exclude visited" filter (V2) · Stamp display must be visually rewarding

---

## Cross-Persona Friction Summary

| Friction point | Personas affected | Priority |
|---|---|---|
| Search load time on mobile | Yuki | High |
| Data freshness / "is it still open?" | Yuki, Jason | High |
| Check-in discoverability (buried flow) | Yuki, Jason | High |
| "Social" mode label clarity | Jason | Medium |
| Stamp display visual satisfaction | Mei-Ling | Medium |
| Enrichment data depth for specialty queries | Mei-Ling | Medium |
| No "exclude already visited" filter | Mei-Ling | Low (V2) |
