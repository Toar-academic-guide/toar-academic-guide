# Reichman תשפ״ז published routes

The numeric evaluator covers `reichman_cs`, `reichman_law` and standalone `reichman_psychology`. It does not cover special, entrepreneurship, direct master's, pre-medicine or economics-combination tracks.

## Evidence

The recorded official PDF is [ספי קבלה לתואר ראשון תשפ״ז](https://www.runi.ac.il/media/4tsb3m1v/ספי-קבלה-לתואר-ראשון-תשפז.pdf). The live URL was inaccessible on 2026-10-23. Thresholds were re-read from the operator-supplied `may.txt` extract, with bidirectional formatting characters removed for inspection while preserving column positions. The accompanying audit hypotheses were not treated as evidence. PDF row order, right to left: program, coordinated, Bagrut, psychometric, English, mathematics, other conditions, preparation.

| Program row | Coordinated | Bagrut | Psychometric | Additional numeric gates |
|---|---:|---:|---:|---|
| מדעי המחשב and the listed CS variants | 705 | 108 | 720 | Coordinated requires psychometric 660. Math: 5 units at 85 for coordinated/Bagrut; 5 at 80 for psychometric. Bagrut also requires 5 units at 85 in physics, chemistry, biology or computer science, excluding systems design. |
| משפטים תארים כפולים / משפטים בדגש בינלאומי | 650 | 100 | 700 | Coordinated requires psychometric 610. Preparation note applies to the law/business combination, not every law application. |
| פסיכולוגיה | 620 | 100 | 640 | Math at least 3 units at 85; English at least 4 units at 90. |

The CS Bagrut value is **108**, not the 110 in the separate psychology/pre-medicine row. Standalone psychology is distinct from psychology/economics (620/100/680) and psychology/pre-medicine (705/110/720).

The PDF requires Bagrut eligibility on the psychometric route. Its footnotes require Hebrew YAEL/YAELNET 105 for the specified non-Hebrew schooling/exam cases, and submission of an English classification result within two months of registration when absent. Full certificate eligibility and applicable language requirements remain unconfirmed manual conditions; a numeric match returns `pending` with `scoreAssessment: meets_threshold`, never final acceptance. Psychology's explicit math/English subject gates are evaluated numerically before that state.

## Formula and confidence

The existing client-derived coordinated formula is reused unchanged through a shared helper: `4.812 × Bagrut + 0.5131 × psychometric − 163.19`. Example outputs: 70/420 → 389.152; 100/650 → 651.525; 110/700 → 725.3. No rounding occurs before threshold comparison.

The [official calculator](https://www.runi.ac.il/admissions/undergraduate/calculator) states that the displayed average is indicative and that the admissions office's calculation determines the registration average. Pairing extracted thresholds with the existing reverse-engineered formula does not establish exact replay proof. Results therefore remain `estimated`, with medium confidence; the source registry's partial evidence is not promoted to verified.

## Official program destinations

These pages were fetched successfully on 2026-10-23; local catalogue destinations add `utm_source=myway&utm_medium=referral`:

- [Computer science](https://www.runi.ac.il/schools/computer-science/undergraduate/)
- [Law](https://www.runi.ac.il/schools/law/undergraduate/)
- [Psychology](https://www.runi.ac.il/schools/psychology/undergraduate/)

Local catalogue notes were aligned with these PDF rows. No database seed or publication was run, so existing production catalogue rows and links are unchanged until a separately authorized data update.

## Verification boundaries

API integration tests use the real request parser, evaluator and static catalogue fixtures, with catalogue reads and freshness DB reads isolated. They perform no database writes. The running local API returned HTTP 200 and `below` for 420/70 for all three IDs, and `pending` / `meets_threshold` for 740/110 with qualifying subject inputs. Six Reichman detail Playwright checks passed at 390px and 1440px, including rendered explanations, Contact/Save visibility and no horizontal overflow. Two existing landing-page calculator flow checks also passed at those widths. Screenshots were inspected for Hebrew copy and alignment. These checks ran in explicit local static mode and prove local rendering and route execution only; they are not evidence of production database state. Preview evidence is recorded separately in the PR body.
