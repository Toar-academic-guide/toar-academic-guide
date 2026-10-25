# Vercel WAF rate limits for admissions APIs

Recorded 2026-10-25. MyWay (`findmyway.co.il`), Vercel Pro project `toar-academic-guide`
(`prj_8tF67SAFRoVKZFr5ek8CUrDCBfTM`), team `team_oRbPlYfZGVpgnYZv5mL6QuFT`.
This document records existing rules; it does not apply configuration changes.

## Why

The admissions limiters use in-process `Map` state, isolated per serverless instance.
They are not an effective global limit on Vercel: the evaluate limiter returned only
2 app-level 429s across 122 burst requests from one IP despite its 12/minute limit.
The WAF provides the durable edge limit, with counters **per region**, not one
worldwide counter.

Evaluate allows **60 POSTs/minute per IP per region**, rather than 12, so a whole
school class sharing one NAT/public IP can legitimately use the calculator. Routes
allows **30 POSTs/minute per IP per region**.

## Rules as applied

Applied on 2026-10-25 at approximately 07:09–07:10 Asia/Jerusalem through Vercel MCP
`update_firewall_config`, action `rules.insert`, one rule at a time; never
`put_firewall_config`. Active configuration: **version 2**, firewall
`waf_czbQDHvqwRP2` (`updatedAt: 2026-10-25T05:10:05.233Z`).

| Name                        | Rule ID                                 | Exact method + path match           | Algorithm / window   | Limit | Key  | On limit                        |
| --------------------------- | --------------------------------------- | ----------------------------------- | -------------------- | ----- | ---- | ------------------------------- |
| `myway-evaluate-rate-limit` | `rule_myway_evaluate_rate_limit_wDLIXz` | `POST` + `/api/admissions/evaluate` | `fixed_window` / 60s | 60    | `ip` | Default `rate_limit` → HTTP 429 |
| `myway-routes-rate-limit`   | `rule_myway_routes_rate_limit_NysL3m`   | `POST` + `/api/admissions/routes`   | `fixed_window` / 60s | 30    | `ip` | Default `rate_limit` → HTTP 429 |

Both rules are active and valid. The two `rules[]` objects below are copied verbatim
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
routes POST `{}` returns 400 before the app limiter runs; the WAF counts every
matching POST regardless of the app response.

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
exercise the in-app limiter, but still counted at the WAF.

Firewall observability (`vercel.firewall_action.count`, 05:05–05:20Z) recorded
125 `allow` actions with an empty rule ID and no `rate_limit` denials. It also
recorded one separate `deny` from Vercel's `sys_dos_mitigation` system rule at
approximately 07:08, before these checks; that was not a custom rate-limit denial.

**The rules are live and valid, but were not observed tripping.** Vercel counts per
region and the traffic split across `fra1` and `arn1`, so no region reached its
limit: the threaded evaluate maximum was 43/60 and routes 24/30. Run 1 also spanned
more than one minute. These checks do not demonstrate a WAF-generated 429.

To distinguish responses:

- **WAF 429:** generated by Vercel; inspect the `x-vercel-mitigated` header and a non-JSON Vercel response body.
- **App 429:** JSON error code `ADMISSIONS_EVALUATION_RATE_LIMITED` or `ADMISSIONS_ROUTE_RATE_LIMITED`; routes also sets `Retry-After`.

Future check: watch **Firewall → traffic**, grouped by each of these custom rules,
to confirm counts and any rate-limit actions during real traffic.

## Cost

Vercel Pro WAF rate limiting is usage-based: **$0.50 per 1M allowed requests
evaluated by the rule**, with regional pricing. Traffic on these two POST endpoints
is small. See [Vercel's rate-limit pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting#pricing).
