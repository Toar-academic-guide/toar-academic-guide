# PR #278 visual evidence

Code SHA: 203fe98. Captured against the local static production build at /app/calculator#detail using headless Chromium, 1280px and 390px widths, 1000px viewport height, full-page screenshots. All evaluations use the actual local API; no response mocks.

| Files                                  | Programme         | Bagrut | Psychometric | Other inputs                                                  | Expected state                                                                                   |
| -------------------------------------- | ----------------- | ------ | ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| economics-1280.png / economics-390.png | colmgmt_economics | 70     | 420          | No subjects, institution average, or confirmations            | exact / below, estimated; no all-route rejection disclaimer                                      |
| estimate-1280.png / estimate-390.png   | colmgmt_law       | 110    | 650          | No subjects, institution average, or certificate confirmation | exact / accepted, estimated; no certificate condition                                            |
| law-1280.png / law-390.png             | colmgmt_law       | 110    | 650          | No subjects, institution average, or confirmations            | exact / accepted, plain green meets-cutoff; estimate notice; no certificate gate                 |
| g2-1280.png / g2-390.png               | colmgmt_economics | 83.3   | 420          | No subjects or institution average                            | needs_input / unknown, no estimate flag/reason/notice; subject record required; 83.3 = 85 × 0.98 |

Economics, estimate and law show the average-estimate notice; G2 must not show it. Every screenshot shows prominent Contact/Save actions. Script checks right-aligned RTL text, no horizontal overflow, expected API decisions/provenance and no page errors. All eight images are opened and inspected individually before delivery. Law uses 110/650: the requested 110/100 draft had an invalid psychometric score (valid range 200-800). verification.json records the observed API states and computed rendering metrics.

VISUAL change — stays draft pending Amit's approval.

Inspection: all eight images were opened individually. Law/estimate show the plain green scores-meet-cutoff success state, the required proxy notice, no certificate condition and no final-admission disclaimer. Economics 70/420 remains below with its estimate line and without the obsolete rejection sentence. G2 remains needs_input with no estimate flag/reason/notice. Contact/Save remain prominent; all images have right-aligned Hebrew, no horizontal overflow at 390 or 1280 and no page JavaScript errors.

Local checks: lint, typecheck, format:check, full npm test (3,638 passed / 86 existing skips), real guard (2,735 passed), static production build and all 126 applicable browser cases passed across the ten-spec run and corrected economics-spec rerun (four existing conditional skips). The evidence commit changes only images and documentation.
