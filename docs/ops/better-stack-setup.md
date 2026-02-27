# Better Stack Uptime Monitoring Setup

Manual setup guide for configuring Better Stack uptime monitoring for CafeRoam.

**ADR:** [docs/decisions/2026-02-27-better-stack-over-uptimerobot.md](../decisions/2026-02-27-better-stack-over-uptimerobot.md)

---

## Prerequisites

- Better Stack account (free tier): https://betterstack.com
- CafeRoam API deployed with `/health` and `/health/deep` endpoints
- Slack or Discord webhook URL for alerts

## Monitors to Create

| Monitor | URL | Interval | Purpose |
|---------|-----|----------|---------|
| API Health | `https://api.caferoam.com/health` | 60s | Shallow check — app is running |
| Web Health | `https://caferoam.com` | 60s | Frontend is reachable |
| API Deep Health | `https://api.caferoam.com/health/deep` | 300s | DB connectivity + latency |

### Monitor Configuration

For each monitor:

1. **Request method:** GET
2. **Expected status code:** 200
3. **Timeout:** 30 seconds
4. **Confirmation period:** 2 consecutive failures before alerting (avoids flapping)

For the Deep Health monitor specifically:
- The endpoint returns `503` when the database is unreachable
- Set "Expected status code" to `200` so any non-200 triggers an alert

## Alert Policy

1. Go to **Alerting > On-call** in Better Stack
2. Create an escalation policy:
   - **First alert:** Slack/Discord webhook + email (immediate)
   - **Escalation:** Email again after 15 minutes if unacknowledged
3. Assign the policy to all 3 monitors

### Slack/Discord Integration

1. In Better Stack: **Integrations > Slack** (or **Webhooks** for Discord)
2. For Slack: Install the Better Stack app and select a channel
3. For Discord: Create a webhook in your Discord channel settings, paste the URL into Better Stack's webhook integration

## Status Page

1. Go to **Status Pages** in Better Stack
2. Create a new status page
3. Add all 3 monitors
4. Set the custom domain to `status.caferoam.com`
5. In your DNS provider, add a CNAME record:
   - **Name:** `status`
   - **Value:** provided by Better Stack (shown in status page settings)
   - **TTL:** 3600

## Free Tier Limits

- 10 monitors (we use 3)
- 3-minute minimum check interval (we use 60s and 300s)
- 20 status page subscribers
- 6-month data retention

## Health Endpoint Reference

### GET /health (shallow)

```json
{"status": "ok"}
```

Always returns 200 if the app process is running. No external dependencies checked.

### GET /health/deep

```json
{
  "status": "healthy",
  "checks": {
    "postgres": {
      "status": "healthy",
      "latency_ms": 12.3
    }
  }
}
```

Returns 200 when all checks pass, 503 when any check fails. Currently checks Postgres connectivity via a lightweight `SELECT id FROM shops LIMIT 1` query.
