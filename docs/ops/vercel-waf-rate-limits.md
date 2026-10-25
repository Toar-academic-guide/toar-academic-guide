# Vercel WAF rate limits for admissions APIs

Recorded 2026-10-25. MyWay (`findmyway.co.il`), Vercel Pro project `toar-academic-guide`
(`prj_8tF67SAFRoVKZFr5ek8CUrDCBfTM`), team `team_oRbPlYfZGVpgnYZv5mL6QuFT`.
This document records existing rules; it does not apply configuration changes.

**WAF enforcement is NOT confirmed.** Both rules are active and valid in config v2,
but the confirmation burst exceeded the evaluate limit in one region without a
WAF 429. The cause remains open; see the confirmation burst below.

## Why

The admissions limiters use in-process `Map` state, isolated per serverless instance.
They are not an effective global limit on Vercel: the evaluate limiter returned only
2 app-level 429s across 122 burst requests from one IP despite its 12/minute limit.
The WAF is intended to provide the durable edge limit, with counters **per region**,
not one worldwide counter; enforcement has not been confirmed.

Evaluate is configured for **60 POSTs/minute per IP per region**, rather than 12,
so a whole school class sharing one NAT/public IP can legitimately use the
calculator. Routes is configured for **30 POSTs/minute per IP per region**.

## Rules as applied

Applied on 2026-10-25 at approximately 07:09–07:10 Asia/Jerusalem through Vercel MCP
`update_firewall_config`, action `rules.insert`, one rule at a time; never
`put_firewall_config`. Active configuration: **version 2**, firewall
`waf_czbQDHvqwRP2` (`updatedAt: 2026-10-25T05:10:05.233Z`).

| Name                        | Rule ID                                 | Exact method + path match           | Algorithm / window   | Limit | Key  | Configured on limit             |
| --------------------------- | --------------------------------------- | ----------------------------------- | -------------------- | ----- | ---- | ------------------------------- |
| `myway-evaluate-rate-limit` | `rule_myway_evaluate_rate_limit_wDLIXz` | `POST` + `/api/admissions/evaluate` | `fixed_window` / 60s | 60    | `ip` | Default `rate_limit` → HTTP 429 |
| `myway-routes-rate-limit`   | `rule_myway_routes_rate_limit_NysL3m`   | `POST` + `/api/admissions/routes`   | `fixed_window` / 60s | 30    | `ip` | Default `rate_limit` → HTTP 429 |

Both rules are active and valid in config v2; this does not confirm enforcement.
The two `rules[]` objects below are copied verbatim
from `/workspace/codex-tasks/waf-after.json`, with enclosing indentation removed.

<!-- prettier-ignore -->
```json
{
  "action": {
    "mitigate": {
      "action": "rate_limit",
      "actionDuration": null,
      "rateLimit": {
        "action": "rate_limit",
        "algo": "fixed_window",
        "keys": [
          "ip"
        ],
        "limit": 60,
        "window": 60
      }
    }
  },
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        {
          "op": "eq",
          "type": "method",
          "value": "POST"
        },
        {
          "op": "eq",
          "type": "path",
          "value": "/api/admissions/evaluate"
        }
      ]
    }
  ],
  "description": "MyWay: 60 POST/min per IP on /api/admissions/evaluate (in-memory 12/min limiter is per-instance; 60 allows class NAT).",
  "id": "rule_myway_evaluate_rate_limit_wDLIXz",
  "name": "myway-evaluate-rate-limit",
  "valid": true,
  "validationErrors": null
}
```

<!-- prettier-ignore -->
```json
{
  "action": {
    "mitigate": {
      "action": "rate_limit",
      "actionDuration": null,
      "rateLimit": {
        "action": "rate_limit",
        "algo": "fixed_window",
        "keys": [
          "ip"
        ],
        "limit": 30,
        "window": 60
      }
    }
  },
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        {
          "op": "eq",
          "type": "method",
          "value": "POST"
        },
        {
          "op": "eq",
          "type": "path",
          "value": "/api/admissions/routes"
        }
      ]
    }
  ],
  "description": "MyWay: 30 POST/min per IP on /api/admissions/routes (in-memory limiter is per-instance).",
  "id": "rule_myway_routes_rate_limit_NysL3m",
  "name": "myway-routes-rate-limit",
  "valid": true,
  "validationErrors": null
}
```

The baseline read in `/workspace/codex-tasks/waf-before.json` returned HTTP 404,
`Config not found`: no firewall configuration had ever been saved, so the baseline
was Vercel defaults with zero custom rules, zero IP rules, and no managed-rule
overrides. Creating the first configuration also materialised Vercel's default CRS
entries: `gen`, `rce`, `sqli`, and `xss` active in **log** mode; `java`, `lfi`, `ma`,
`php`, `rfi`, `sd`, and `sf` inactive. It also materialised `firewallEnabled: true`.
These are Vercel defaults, not changes we chose.

Vercel Pro supports fixed windows from 10 seconds to 10 minutes, IP/JA4 keys, and
40 rate-limit rules per project. Counters are per region, so a shared IP can exceed
the configured total across regions. See [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

## In-app limiters unchanged

Keep both limiters as the local/CI backstop; do not remove them:

- [Evaluate](../../src/server/admissions/rateLimit.ts): 12 requests per 60 seconds per client key.
- [Routes](../../src/server/admissions/routes/rateLimit.ts): 6 requests per 60 seconds per client key, with at most 2 concurrent requests.

The [evaluate handler](../../src/app/api/admissions/evaluate/route.ts) applies its
limiter before parsing the JSON payload. The [routes handler](../../src/app/api/admissions/routes/route.ts)
validates the payload and checks capability before acquiring its limiter. Thus
routes POST `{}` returns 400 before the app limiter runs; the WAF rules are
configured to count every matching POST regardless of the app response.

## Rollback

For an authorised rollback, call `update_firewall_config` with `rules.update` and
the target rule ID. The `value` must contain the full `name`, `active`,
`conditionGroup`, and `action`, preserving the same rule except `active: false`.
For example, to disable evaluate:

```json
{
  "action": "rules.update",
  "id": "rule_myway_evaluate_rate_limit_wDLIXz",
  "value": {
    "name": "myway-evaluate-rate-limit",
    "active": false,
    "conditionGroup": [
      {
        "conditions": [
          {
            "op": "eq",
            "type": "method",
            "value": "POST"
          },
          {
            "op": "eq",
            "type": "path",
            "value": "/api/admissions/evaluate"
          }
        ]
      }
    ],
    "action": {
      "mitigate": {
        "action": "rate_limit",
        "actionDuration": null,
        "rateLimit": {
          "action": "rate_limit",
          "algo": "fixed_window",
          "keys": ["ip"],
          "limit": 60,
          "window": 60
        }
      }
    }
  }
}
```

For routes, use `rule_myway_routes_rate_limit_NysL3m` and that rule's full values
from above, again changing only `active` to `false`. Do not send only `active`.
Alternatively, delete either rule with:

```json
{ "action": "rules.remove", "id": "<rule id>", "value": null }
```

Dashboard: **Project → Firewall → Rules → Configure → edit/disable → Review Changes → Publish**.
Disabling/removing these rules rolls back the custom limits; the full baseline
snapshot in `waf-before.json` is “no config” (404), not a saved empty configuration.
Do not replace the full configuration with `put_firewall_config`.

## Verification: 2026-10-25, Asia/Jerusalem

Evidence: `/workspace/qa-evidence/waf-2026-10-25/SUMMARY.md` and its adjacent JSON
files. These are the recorded checks, not new tests run for this documentation.

| Check                              | Traffic                                | App responses                                | WAF 429s | Edge regions         | Evidence file                         |
| ---------------------------------- | -------------------------------------- | -------------------------------------------- | -------- | -------------------- | ------------------------------------- |
| Singles, ~07:10                    | 2 evaluate POSTs                       | 2 × 200                                      | 0        | `fra1`, `arn1`       | `single-1.json`, `single-2.json`      |
| Run 1, sequential                  | 61 evaluate POSTs, ~67s actual elapsed | 59 × 200; 2 × app-429 (#47, #48)             | 0        | `fra1` / `arn1`      | `evaluate-burst-run1-sequential.json` |
| Run 2, threaded, 07:14:40–07:15:26 | 61 evaluate POSTs fired over 45s       | 61 × 200                                     | 0        | `fra1=43`, `arn1=18` | `evaluate-burst.json`                 |
| Recovery, ~07:16:19                | 1 evaluate POST                        | 200                                          | 0        | `fra1`               | `evaluate-after-70s.json`             |
| Routes, 07:16:27–07:16:52          | 31 POSTs with `{}` over 25s            | 31 × 400, `ADMISSIONS_ROUTE_PAYLOAD_INVALID` | 0        | `fra1=24`, `arn1=7`  | `routes-burst.json`                   |

Run 1 exceeded a minute because request latency was ~1.1s; its JSON `span_s: 50`
was the configured span, not actual elapsed time. Routes' invalid payloads did not
exercise the in-app limiter, but matched the WAF rule's method/path conditions.

Firewall observability (`vercel.firewall_action.count`, 05:05–05:20Z) recorded
125 `allow` actions with an empty rule ID and no `rate_limit` denials. It also
recorded one separate `deny` from Vercel's `sys_dos_mitigation` system rule at
approximately 07:08, before these checks; that was not a custom rate-limit denial.

In these initial checks, the threaded evaluate maximum was 43/60 in one region
and routes 24/30; run 1 also spanned more than one minute. The per-region split
was the initial explanation for no WAF 429. The confirmation burst below exceeded
the evaluate limit within one minute in one region, so that explanation no longer
holds. **WAF enforcement is NOT confirmed.**

To distinguish responses:

- **WAF 429:** generated by Vercel; inspect the `x-vercel-mitigated` header and a non-JSON Vercel response body.
- **App 429:** JSON error code `ADMISSIONS_EVALUATION_RATE_LIMITED` or `ADMISSIONS_ROUTE_RATE_LIMITED`; routes also sets `Retry-After`.

Future check: watch **Firewall → traffic**, grouped by each of these custom rules,
to confirm counts and any rate-limit actions during real traffic.

### Confirmation burst (2026-10-25 07:29 Asia/Jerusalem)

**WAF enforcement is NOT confirmed.** Rule A
(`rule_myway_evaluate_rate_limit_wDLIXz`) did not trip even with more than 60
requests from one IP in one minute in one region. The per-region split no longer
explains the result. Both rules remain active and valid in config v2; the cause
is open.

Amit approved this larger check: **150 parallel POSTs over 30s** to
`/api/admissions/evaluate` (07:29:32.3–07:30:01.8 Asia/Jerusalem).
Raw evidence: `evaluate-burst-2.json` beside `SUMMARY.md`.

| Region | Requests | 200 | App-429 | WAF-429 | First WAF 429 |
| ------ | -------- | --- | ------- | ------- | ------------- |
| `fra1` | 110      | 88  | 22      | 0       | none          |
| `arn1` | 40       | 37  | 3       | 0       | none          |

Of the `fra1` requests, **103 were inside the single clock minute 07:29**.
Totals: 125 × 200, 25 × app-429, 0 × WAF-429; the first app-429 was at request
**#58**. No response had an `x-vercel-mitigated` header. Egress IP stayed stable
under parallelism: 10/10 parallel ipify checks returned `104.28.244.17`.
The recovery single request returned **200** (`evaluate-after-burst-2.json`).

Firewall metrics for **07:20–07:40 Asia/Jerusalem**, grouped by action and rule ID,
showed no `rate_limit` or `deny` actions attributed to either
`rule_myway_evaluate_rate_limit_wDLIXz` or `rule_myway_routes_rate_limit_NysL3m`.
There was only one `sys_dos_mitigation` deny. The 12,855 (~12.8k) `allow` events
had an empty rule ID and were mostly preview-environment traffic (`/login`, `/`,
`/institutions`, etc.), not this test.

The `/routes` confirmation burst was not run because it was gated on the evaluate
rule tripping, which did not happen.

Open checks:

- Inspect Firewall dashboard traffic for the rule.
- Check whether inner `rateLimit.action: "rate_limit"` behaves as the dashboard's "Default (429)".
- Check rule propagation.

## Cost

Vercel Pro WAF rate limiting is usage-based: **$0.50 per 1M allowed requests
evaluated by the rule**, with regional pricing. Traffic on these two POST endpoints
is small. See [Vercel's rate-limit pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting#pricing).
