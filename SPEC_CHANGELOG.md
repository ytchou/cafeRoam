# SPEC Changelog

Every change to SPEC.md must be logged here immediately after the edit is made.

**Format:** `YYYY-MM-DD | Section changed | What changed | Why`

---

| Date       | Section           | Change                                                                                                                            | Rationale                                                                                                                                 |
| ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-23 | Initial           | SPEC.md created from /scope session                                                                                               | Initial project scoping                                                                                                                   |
| 2026-02-23 | §2 System Modules | Clarified data pipeline as one-time collection (Cafe Nomad seed + Apify scrape) vs ongoing enrichment (Claude Haiku + embeddings) | Design doc produced for 3-pass data collection pipeline                                                                                   |
| 2026-02-23 | §1 Tech Stack     | Next.js version updated from 15 → 16                                                                                              | Scaffold installed next@16.1.6 which was verified working; v16 changes include jsx: react-jsx (was preserve), eslint . replaces next lint |
