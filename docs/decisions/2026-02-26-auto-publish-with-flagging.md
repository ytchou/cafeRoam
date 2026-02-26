# ADR: Auto-publish User Submissions With Admin Flagging

Date: 2026-02-26

## Decision
User-submitted shops are auto-published after successful enrichment, flagged for admin review via dashboard + daily email digest.

## Context
Users can submit Google Maps URLs to add new coffee shops. We needed to decide whether submissions require admin approval before going live.

## Alternatives Considered
- **Admin approval queue**: Submissions go into a pending state until manually approved. Rejected: creates a bottleneck for a solo developer and adds friction that undermines the community contribution vibe.
- **Auto-publish without flagging**: Just publish and trust the pipeline. Rejected: no safety net for spam, non-coffee-shop submissions, or data quality issues.

## Rationale
Auto-publishing with flagging balances community growth (low friction, instant gratification for submitters) with data quality (admin can review and remove bad entries). Success is visible in the community activity feed (社群動態), reinforcing the collaborative contribution model. Failed submissions notify the submitter privately via in-app notification.

## Consequences
- Advantage: Zero bottleneck on admin availability. Submissions go live in minutes, not days.
- Advantage: Community activity feed makes submissions feel like contributions, encouraging more.
- Disadvantage: Bad data may be live briefly before admin reviews it. Acceptable at V1 scale (5-20 submissions/month).
- Disadvantage: Requires admin dashboard + daily digest email infrastructure.
