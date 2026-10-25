# TAU 2027 rejection thresholds

Official source: TAU `go.tau.ac.il` GraphQL `getProgramByIdAndLang` and programme page data, using `field_this_year_receipt_threshol` and `field_this_year_rejection_thresh`. The captured pages display the תשפ"ז (2026–2027) registration banner. The captures below agree on each programme's acceptance and rejection thresholds.

This is a code-only update to rejection thresholds and the Digital Sciences runtime policy. Acceptance values, formulas, source and fixture fingerprints, capture timestamps, and fixture scores/verdicts are unchanged. Formula confidence remains unchanged/official. No manifest or publisher changes and no `canonical_change` are included. Known gaps: none beyond existing.

| Programme | Contract(s) | Acceptance | Rejection before | Rejection after | Official URL | Capture file |
| --- | --- | --- | --- | --- | --- | --- |
| Biology | `TAU_BIOLOGY_CONTRACT`, `TAU_LEGACY_BIOLOGY_CONTRACT` | 576 | 570 | 575 | https://go.tau.ac.il/he/life/ba/bio | `/workspace/pm-research/raw/official/tau/review8_biology_20261025T165840Z.txt`, `/workspace/pm-research/raw/official/tau/review8_biology-legacy_20261025T165840Z.txt` |
| Digital Sciences for Hi-Tech | `TAU_DIGITAL_SCIENCES_CONTRACT`, `TAU_GENERIC_DATASCIENCE_CONTRACT` | 652 | 632 | 651 | https://go.tau.ac.il/he/engineering/ba/high-tech-plus | `/workspace/pm-research/raw/official/tau/review8_digital-sciences_20261025T165840Z.txt`, `/workspace/pm-research/raw/official/tau/review8_digital-sciences-legacy_20261025T165840Z.txt` |
| Economics | `TAU_ECONOMICS_CONTRACT`, `TAU_LEGACY_ECONOMICS_CONTRACT` | 610 | 600 | 609 | https://go.tau.ac.il/he/social-sciences/ba/economics | `/workspace/pm-research/raw/official/tau/review8_economics_20261025T165840Z.txt`, `/workspace/pm-research/raw/official/tau/review8_economics-legacy_20261025T165840Z.txt` |
| Industrial Engineering & Management | `TAU_INDUSTRIAL_CONTRACT` | 667 | 647 | 666 | https://go.tau.ac.il/he/engineering/ba/industrial-engineering | `/workspace/pm-research/raw/official/tau/review8_industrial_20261025T165840Z.txt` |
| Electrical Engineering | `TAU_EE_CONTRACT`, `TAU_LEGACY_EE_CONTRACT` | 710 | 690 | 709 | https://go.tau.ac.il/he/engineering/ba/electrical (node 11233) | `/workspace/pm-research/raw/official/tau/review9_ee_20261025T171145Z.txt` |
| Mechanical Engineering | `TAU_ME_CONTRACT`, `TAU_LEGACY_ME_CONTRACT` | 650 | 616 | 649 | https://go.tau.ac.il/he/engineering/ba/mechanical (node 8288) | `/workspace/pm-research/raw/official/tau/review9_me_20261025T171145Z.txt` |
| Social Work | `TAU_SOCIAL_WORK_CONTRACT`, `TAU_LEGACY_SOCIAL_WORK_CONTRACT` | 580 | 569 | 579 | https://go.tau.ac.il/he/social-sciences/ba/social-work (node 8299) | `/workspace/pm-research/raw/official/tau/review9_social-work_20261025T171145Z.txt` |

Social Work's old encoded rejection value (569) equals TAU's last-year rejection value. Mechanical Engineering's last-year rejection was 635; Electrical Engineering's was 704. The new code values use the this-year fields.

Legacy aliases inherit their parent calculations. Communication (530/529), Political Science (535/534), Education (550/549), and Occupational Therapy and its legacy alias (607/606) retain their explicit acceptance/rejection cutoffs. The internal CS template retains 706/695; its Electrical and Mechanical Engineering descendants use their own cutoffs shown above. No separate Electrical Engineering, Mechanical Engineering, or Social Work policy file exists.
