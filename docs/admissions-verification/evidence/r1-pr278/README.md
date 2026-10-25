# PR #278 visual evidence

Code SHA: 372452c. Captured against the local static production build at /app/calculator#detail using headless Chromium, 1280px and 390px widths, 1000px viewport height, full-page screenshots. All evaluations use the actual local API; no response mocks.

| Files                                  | Programme         | Bagrut | Psychometric | Other inputs                                                  | Expected state                                                              |
| -------------------------------------- | ----------------- | ------ | ------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| economics-1280.png / economics-390.png | colmgmt_economics | 70     | 420          | No subjects, institution average, or confirmations            | manual_gate / below, estimated; no all-route rejection disclaimer           |
| estimate-1280.png / estimate-390.png   | colmgmt_law       | 110    | 650          | No subjects, institution average, or certificate confirmation | manual_gate / pending, estimated; certificate unconfirmed                   |
| g2-1280.png / g2-390.png               | colmgmt_economics | 83.3   | 420          | No subjects or institution average                            | needs_input / unknown, estimated; subject record required; 83.3 = 85 × 0.98 |

Every screenshot must show the average-estimate notice and prominent Contact/Save actions. Script checks right-aligned RTL text, no horizontal overflow, expected API decisions/provenance and no page errors. Images are opened and inspected individually before delivery. verification.json records the observed API states and computed rendering metrics.

VISUAL change — stays draft pending Amit's approval.

Inspection: all six images were opened individually after capture. Economics shows below and no obsolete disclaimer; law shows the estimate notice with unconfirmed certificate; G2 shows missing details and the subject-record next action. All six have right-aligned Hebrew, visible estimate text and no horizontal overflow; Contact and Save remain prominent. Computed estimate style is 12px, RTL/right, muted rgb(94, 106, 131). No page JavaScript errors were recorded.

Local verification: static production build succeeded; affected Playwright specs completed 126 passed / 4 existing conditional skips / zero failures. The required guard passed 2,708 tests without a bypass.
