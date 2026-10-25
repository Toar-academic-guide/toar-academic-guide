# PR #278 visual evidence

Code SHA: 6c339ad. Captured against the local static production build at /app/calculator#detail using headless Chromium, 1280px and 390px widths, 1000px viewport height, full-page screenshots. All evaluations use the actual local API; no response mocks.

| Files                                  | Programme         | Bagrut | Psychometric | Other inputs                                                  | Expected state                                                                                   |
| -------------------------------------- | ----------------- | ------ | ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| economics-1280.png / economics-390.png | colmgmt_economics | 70     | 420          | No subjects, institution average, or confirmations            | manual_gate / below, estimated; no all-route rejection disclaimer                                |
| estimate-1280.png / estimate-390.png   | colmgmt_law       | 110    | 650          | No subjects, institution average, or certificate confirmation | manual_gate / pending, estimated; certificate unconfirmed                                        |
| g2-1280.png / g2-390.png               | colmgmt_economics | 83.3   | 420          | No subjects or institution average                            | needs_input / unknown, no estimate flag/reason/notice; subject record required; 83.3 = 85 × 0.98 |

Economics and law show the average-estimate notice; G2 must not show it. Every screenshot shows prominent Contact/Save actions. Script checks right-aligned RTL text, no horizontal overflow, expected API decisions/provenance and no page errors. Images are opened and inspected individually before delivery. verification.json records the observed API states and computed rendering metrics.

VISUAL change — stays draft pending Amit's approval.

Inspection: all six images were opened individually. Economics shows below with the estimate notice and without the obsolete sentence. Law shows pending, the notice and the unconfirmed certificate. G2 shows needs_input with the subject-record action and no estimate flag/reason/notice. Hebrew is right-aligned and readable at both widths; Contact/Save remain prominent, no horizontal overflow or page JavaScript errors. verification.json records measured styles and note visibility for each scenario.

Local checks: 3,625 unit tests passed (86 existing skips), guard passed 2,722 tests without bypass, ten affected Playwright specs passed 126 cases (four existing conditional baseline skips), lint/typecheck/format and static production build passed. The evidence commit changes only images and documentation.
