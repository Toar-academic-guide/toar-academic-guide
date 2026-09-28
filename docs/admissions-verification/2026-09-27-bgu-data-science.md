# BGU Data Science quantitative calculation

Production returned exact eligible/831 for Data Science with missing required inputs or quantitative component124. Its generic Sekhem calculator ignored the required quantitative family and gates.

Both catalogue identities (`datascience__bgu`, `bgu_datascience__bgu`) now bind department232/path1/specialization13. Official requirements are quantitative Sekhem720, psychometric600, mathematics90 at four units or80 at five units, English basic level and Hebrew levelE when applicable. The existing confirmation field records applicable language requirements. Discretionary exceptions and prior academic background require university review; this result concerns standard quantitative eligibility.

## Official evidence

[Current programme](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=13&p_degree_level=1) and [quantitative calculator](https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4) were queried independently on2026-09-27. Each pair has its own eligible and below capture.

| Synthetic example | Psychometric | Official BGU average | Quantitative/verbal/English | Official score | Verdict  |
| ----------------- | -----------: | -------------------: | --------------------------- | -------------: | -------- |
| Eligible          |          800 |                  120 | 150/150/150                 |            879 | Above720 |
| Below             |          600 |                  100 | 125/110/100                 |            636 | Below720 |

Both include mathematics five units at85 and language confirmation. Scores were captured independently before application replay. Verdicts derive from current official cutoff and gates. The [proof artifact](2026-09-27-bgu-data-science-live-proof.json) records actual source responses, captures and live comparisons for both Data Science aliases and both Computer Science regression controls. All profiles are synthetic.

## UI verification after activation

1. Open the calculator, choose BGU Data Science (`מדעי הנתונים`), enter psychometric800 and general Bagrut120.
2. Supply official BGU average120, quantitative/verbal/English150/150/150, mathematics five units at85 and confirm applicable language requirements. Calculate: expect879 above720 and an eligible badge.
3. Change psychometric to600, both averages to100 and components to125/110/100. Calculate: expect636 below720.
4. Restore eligible inputs but quantitative124. Calculate: expect failure of the minimum requirement even with a high general score.
5. Remove a required component or official BGU average. Calculate: expect missing-input guidance, never exact eligibility.

The old production authority fingerprint differs. Matching reviewed activation and deployed verification are owed after merge; preview may return authority-unavailable for otherwise complete inputs. No production database mutation was performed for this fix.

## Plan 002 scope

This is part of U6. The127/135 metadata count does not prove127 correct calculations. Other BGU engineering-labelled programmes still route through the general family and need independent investigation. Eight known withheld pairs remain; proposed catalogue corrections await separate approval.
