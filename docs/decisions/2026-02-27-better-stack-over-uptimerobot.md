# ADR: Better Stack over UptimeRobot for uptime monitoring

Date: 2026-02-27

## Decision
Use Better Stack (free tier) instead of UptimeRobot for uptime monitoring.

## Context
SPEC.md originally specified UptimeRobot for uptime monitoring with 5-minute checks and email alerts. During observability design, research revealed that UptimeRobot changed their free tier to non-commercial use only (November 2024). CafeRoam is a commercial product, so the free tier is no longer a valid option.

## Alternatives Considered
- **UptimeRobot (paid, $7/mo Solo)**: Drops to only 10 monitors on Solo plan (need Pro at $14/mo for 50). Adds unnecessary cost for a feature available free elsewhere.
- **Grafana Cloud (free tier)**: Includes synthetic monitoring but requires significant setup overhead with OpenTelemetry. Overkill for basic uptime checks.
- **Better Stack (free tier)**: 10 monitors with 30-second checks, Slack/Discord integration included, unlimited team members, public status page.

## Rationale
Better Stack's free tier is strictly superior to UptimeRobot's paid Solo plan: faster checks (30s vs 60s), Slack/Discord alerts included (UptimeRobot charges extra), and no commercial-use restriction. The 10-monitor limit is sufficient — CafeRoam needs only 3 monitors (API health, web health, deep health).

## Consequences
- Advantage: $0/mo with Slack/Discord alerts, 30-second check intervals, public status page
- Advantage: No commercial-use licensing risk
- Disadvantage: Less name recognition than UptimeRobot (minor — both are established services)
- Disadvantage: Free tier log retention is only 3 days (not relevant — we use Better Stack only for uptime, not log aggregation)
