# Haifa applicant years and official average

Plan 002 remains unfinished. This change repairs the applicant inputs used for Haifa's numeric score replay; it does not establish complete admission eligibility.

## Confirmed defect

The adapter previously supplied certificate year 2020 and exam year 2021 when the profile had neither. It also rounded the supplied average to one decimal and used the generic average rather than an official Haifa average. The profile could not retain Haifa-specific years.

The official Computer Science programme dictionary identifies hug SC0021 / programme 52256544. With official Haifa average 102, quantitative 140, verbal 130, English 130 and exam year 2026, the live calculator returned 699 with certificate year 2020 and 702 with certificate year 2015. The acceptance/rejection cutoffs were 700/679. The 699 result belongs to the waiting band; reaching 702 satisfies the score cutoff only. Mathematics and language requirements still apply. Repeated requests in reverse order reproduced these results.

The registration dictionary explicitly maps API year 2026 / semester 001 to תשפ״ז (2026–2027). Changing that API year to 2027 would select another cycle.

## Change and verification

The profile, request schema and evaluation now carry the official Haifa average, actual certificate/improvement year and actual psychometric exam year. Unknown values stay empty and request input. Decimal precision is retained, and all three real psychometric components are required; components are not inferred from the overall score. The existing profile JSON stores these optional fields without a database migration.

The attached [official captures](2026-09-28-haifa-official.json) retain synthetic requests, results, original-response hashes, programme dictionary identities and additional conditions for 16 distinct programmes / 32 score boundary responses. Eligible-score examples now use valid component scores of 150 instead of 160. Session identifiers and redundant synthetic input echoes are omitted. These responses support numeric replay, not complete eligibility.

Tests use the retained 699/702 responses and check precision, missing/invalid years, profile save/load/clear, API forwarding and alert recalculation. Changing the input policy changes verification fingerprints, so previously reviewed production authority cannot silently certify these new fixtures.

## UI verification

1. Open the academic profile and enter Haifa average 102.25, certificate year 2015 and exam year 2026. Save and reopen the profile; all three values must remain unchanged.
2. For the controlled Computer Science comparison, use average 102 and components 140/130/130 (overall score returned by Haifa: 693). Once matching programme evidence is reviewed and activated, certificate year 2020 must replay 699; 2015 must replay 702. Preserve the waiting band and applicable programme requirements.
3. Clear either year and calculate again. Request the missing value; do not substitute a year or claim an exact result. Generic Bagrut input is not required for Haifa when its official average is supplied.

## Remaining data work

Programme-specific mathematics, language, interview/committee and other conditions require reconciliation with catalogue facts and current official programme pages before complete verdict proof or activation. The API's current Computer Science Hebrew requirement (125) and webpage requirement (120) also need cycle reconciliation. Nursing discloses psychometric 550 and eight science units; occupational therapy and physiotherapy retain selection stages.

Information Systems programme 52256686 is absent from the current open-registration dictionary, though a direct replay still returns scores and cutoffs. Resolve its current route before remapping, removing or activating it. The other 15 identifiers were present. No programme was removed, remapped or published by this change, and no production authority was approved.

Primary sources: [Haifa calculator](https://applicants.haifa.ac.il/enrollmentChances/index.html), [score calculation rules](https://admissions.haifa.ac.il/score-calculation/), [Computer Science requirements](https://admissions.haifa.ac.il/social-sciences/program/3210/?lang=en). Captured 2026-09-28.
