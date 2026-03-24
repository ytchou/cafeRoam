# PRD Changelog

Every change to PRD.md must be logged here immediately after the edit is made.

**Format:** `YYYY-MM-DD | Section changed | What changed | Why`

---

| Date       | Section | Change                             | Rationale               |
| ---------- | ------- | ---------------------------------- | ----------------------- |
| 2026-02-23 | Initial | PRD.md created from /scope session | Initial project scoping |
| 2026-03-24 | §7 Out of Scope | Moved "social feed" from out-of-scope to in-scope. Public user profiles remain out of scope. | DEV-12 — community feed of public check-ins, auth-gated. Existing infrastructure already supports this; formalizing with `is_public` toggle and removing role-gate. |
