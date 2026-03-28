# Linear Workflow

How we organize work in Linear.

## Core Principle

**Linear = what to build and why.**
**TODO.md / TaskCreate = how Claude is executing it right now.**

Linear is the single source of truth for project state. TODO.md and TaskCreate are ephemeral
in-session scratchpads that get discarded when the PR merges.

---

## Hierarchy

```
Project: caferoam
  └── Milestone: Beta Launch
       └── Parent Epic: Launch Readiness [Ops, L]
            └── Sub-issue: Security review [Ops, M, Foundation]
            └── Sub-issue: Observability stack [Ops, M, Foundation]
            └── Sub-issue: Beta program setup [Ops, M]
            └── Sub-issue: Threads launch post [Ops, M]
```

| Level        | What it represents                       | Who creates it              |
|--------------|------------------------------------------|-----------------------------|
| Project      | The product (caferoam)                   | One-time setup              |
| Milestone    | A delivery phase (Beta, V1, Revenue)     | /scope or manual            |
| Parent Epic  | A workstream or module                   | /scope or /brainstorming    |
| Sub-issue    | An implementation task                   | /scope, /brainstorming, /create-ticket |

---

## Labels

### Type (pick one)

| Label       | When to use                                              |
|-------------|----------------------------------------------------------|
| Feature     | New capabilities, user-facing functionality              |
| Bug         | Something broken or behaving incorrectly                 |
| Improvement | Refactors, performance, DX — behavior unchanged          |
| Test        | Test coverage, QA, E2E, CI quality                       |
| Ops         | Infrastructure, deploy, monitoring, launch logistics     |
| Strategy    | Product/pricing decisions, architectural tradeoffs       |
| Competitor  | Competitor research or inspiration                       |
| Resource    | Tooling or third-party service setup                     |

### Scope (pick one)

| Label | Meaning                          |
|-------|----------------------------------|
| S     | Isolated, 1-2 files              |
| M     | A few moving parts               |
| L     | Broad impact or unclear scope    |

### Sequence

| Label      | Meaning                                                                              |
|------------|--------------------------------------------------------------------------------------|
| Foundation | Must be completed before other tickets in the same epic/milestone can proceed. Schema, interfaces, core infrastructure. |

---

## Ordering Convention

Sub-issues within a parent epic follow three ordering rules:

1. **Foundation first** — all Foundation-labeled tickets are completed before non-Foundation tickets in the same epic.
2. **Creation order** — sub-issues are created in intended execution order. Work top-to-bottom within the epic.
3. **blockedBy for hard gates** — use `blockedBy` only when a task genuinely cannot start before another completes. Don't chain every ticket.

---

## Milestones

Milestones represent delivery phases, not sprints. Each milestone answers: "what must be done before [event]?"

| Milestone     | Gate event                                   |
|---------------|----------------------------------------------|
| Beta Launch   | Opening to beta users                        |
| Post-Beta V1  | After beta feedback, before public launch    |
| Revenue V1    | First monetization features                  |

New milestones are created by /scope (for new projects) or manually when the project's delivery phases change.

Done tickets should be assigned to the milestone they were completed in — this keeps progress bars accurate and provides a historical record of what shipped per phase.

---

## Views (Linear UI only — not MCP-creatable)

Four saved views for common perspectives:

| View                | Filter                                               | Purpose                          |
|---------------------|------------------------------------------------------|----------------------------------|
| Launch Checklist    | Milestone: Beta Launch, Status: not Done/Canceled    | What's left before beta          |
| Active Work         | Status: In Progress or In Review                     | What's being worked on now       |
| Strategy & Revenue  | Label: Strategy or Milestone: Revenue V1             | Product/monetization decisions   |
| Bug Queue           | Label: Bug, Status: not Done/Canceled                | All open bugs                    |

---

## Skill Integration

| Skill            | What it creates in Linear                               |
|------------------|---------------------------------------------------------|
| /scope           | Project + milestones + parent epics + sub-issues        |
| /brainstorming   | Parent epic (if new) + sub-issues after design approval |
| /create-ticket   | Single ticket with milestone + parent inference         |
| /list-tickets    | Reads and ranks by milestone + Foundation + priority    |

---

## What Stays Local

| Tool        | Purpose                                         | Lifetime        |
|-------------|-------------------------------------------------|-----------------|
| TaskCreate  | In-session step tracking for Claude             | Single session  |
| TODO.md     | Deprecated for project planning; only for in-session execution if needed | Single session |
