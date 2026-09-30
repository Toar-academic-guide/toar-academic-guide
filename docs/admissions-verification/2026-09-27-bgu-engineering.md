# BGU engineering calculator correction — 27 September 2026

Five catalogue pairs (`ee`, `bgu_ee`, `me`, `bgu_me`, `bgu_industrial`, all at BGU) used the general B/P calculator. A production request with P800 and generic average120 returned875 and an accepted verdict, including when required engineering data was absent. Electrical P599 returned749 and accepted despite the published minimum600.

## Current official data

- [Engineering calculator](https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=3), POST `!rg.acc_SubmitEngSekem`, cycle selectors year2/semester1 (2026–2027).
- `GetRdpData` cycle2027/semester1/path1/degree1, departments361 Electrical,362 Mechanical,364 Industrial; exactly one department-matched rule, no specialization. Current rules and URLs are in `2026-09-27-bgu-engineering-rules.json`.
- [Current 2026–2027 admissions guide](https://www.bgu.ac.il/media/0p3ppz0n/ידיעון-תואר-ראשון.pdf), downloaded from the current official bulletin. Preserved PDF SHA256 `00a0e0c00fceaec39bb331bf8e9a005561f9b5e6decbc39eef562b7b009b9114`. Pages23–25 cover engineering scores, bonus subjects and physics; page37 covers recognized practical-engineer qualifications.

| Programme | Engineering cutoff | Minimum total psychometric | Current registration condition |
| --- | ---: | ---: | --- |
| Electrical |547|600|Quota full; waiting list. From July, completed passing five-unit physics or recognized course required.|
| Mechanical |520|550|Quota full; waiting list. Missing five-unit physics retains the required mechanics course condition.|
| Industrial |505|550|Eligibility remains conditional on institutional approval and physics requirements.|

The calculator receives quantitative psychometric score, the official BGU average, mathematics/physics units and grades, the single highest qualifying Industrial bonus subject, and applicable recognized preparatory/diploma grades. The general profile average is never substituted for the official BGU average.

Industrial also has a published route without psychometric scores: official BGU average109, mathematics5/90, physics5/90, EnglishBasic and applicable HebrewE. A BGU precise-sciences/engineering preparatory average91 replaces the average; both subject requirements remain. No fabricated psychometric score or numeric calculator POST is used for this route.

Recognized BGU/Technion preparatory completion from2018 is captured explicitly. Diploma mathematics60–89hours maps to4units and90+ to5; physics90+ maps to5. The guide permits qualifying diploma subjects as Bagrut alternatives. A recognized completed diploma requires the final internal/external/project records; technicians are excluded. Diploma average is40% internal subjects of60+hours,40% external exams and20% final project. Minimum psychometric still applies.

## Evidence and verification

- The saved calculator HTML has whitespace normalized; the PDF and calculator response receipts are preserved. Ten independent official requests (two per catalogue pair), preserved request fields and raw responses in `2026-09-27-bgu-engineering-live-proof.json`. Controlled adapter replays match score, verdict and current-source fingerprint for every fixture in `2026-09-27-bgu-engineering-controlled-proof.json`; metadata uses each actual comparison timestamp.
- P800/Q150/BGUaverage120/math5/95/physics5/95 produces595 for Electrical/Mechanical and600 for Industrial. P600/Q110/BGUaverage100/math5/80/physics5/70 produces412/412/417.
-47 additional official calculator captures establish recognized preparatory-only and diploma routes, department-specific bonuses and bonus boundaries. Industrial uses the highest eligible subject, not the sum: grades80–85→2,86–90→3,91–95→4,96–100→5. Current guide bonus subjects are computer science, chemistry, biology, machine control and mechatronics. Other tested technology subjects do not earn this bonus.
-12 further policy-generated request/equivalence receipts in `2026-09-27-bgu-engineering-extra-controlled-proof.json`: preparatory scores608, diploma-math600/600/605, highest-only Industrial bonus605, independently submitted diploma-only equivalents553(4units)/589(5units). The latter derive subject equivalence from the explicit guide, rather than claiming the bare diploma-only form fields work; those bare fields returned a missing-Bagrut-mathematics error.
-901 unit/integration tests pass;6 existing database-gated tests skip without a database connection. Typecheck passes; lint has no errors (19 existing warnings). Pre-PR guard passes. Focused tests cover engineering endpoint selection, psychometric/physics/direct-route boundaries, source/form/guide changes, profile/API persistence, alert reevaluation and result copy.
- Native integrated browser, local static catalogue: `/` passes Industrial blank-P submission; `/app/profile` saves/reopens all recognized qualification fields including decimal91.25 and false physics confirmation; `/app/calculator` also passes blank-P submission and retains the honest incomplete-authority result. Static mode intentionally reports incomplete official authority; this is not a production exact-calculation claim.

## User verification and activation still owed

Open `/app/profile`, expand “נתונים להנדסה בבן־גוריון,” fill the applicable route/recognized grades and confirm all relevant data is entered. Save, reopen, and confirm values remain. Use a complete subject record and official BGU average/Q score; compare the above examples with the official engineering calculator. Electrical599 must not qualify; clearing required inputs must request those inputs. Industrial109 with mathematics/physics5/90 and language confirmation can be evaluated with psychometric blank. Qualifying Electrical/Mechanical results must show the waiting list; an outstanding Mechanical physics course must remain visible.

After the user merges the matching PR, deploy that head, refresh the five source freshness/verification records with the new fingerprints and perform focused database-backed production profile/calculator checks. Cutoffs are unchanged; no release cutoff publication or schema migration is required. This PR covers engineering, not completion of Plan002. PR170 Data Science and remaining official-data/calculator work stay separate.

## Post-Fix Quality

Scope: fix-owned files in a clean managed worktree based on46954f5. Sequential main-thread review follows the project tool map; no independent subagent or cross-model review is claimed (no different-provider CLI installed).

Simplify: reviewed reuse, quality and efficiency inline; retained the separate engineering adapter and shared profile/request schema. No unrelated cleanup or new caching abstraction.

Review: calculator/policy, metadata/fixture provenance, persistence/API and user-visible conditions reviewed together. Corrected eligible-result normalization (manual eligibility is still exact capability), qualification completion validation, actual comparison timestamps and combined waiting-list/physics copy. No unresolved release-blocking finding in this engineering slice.

Residuals: the existing generic Bagrut average remains mandatory in the UI/API, even for preparatory-only applicants. The adapter proof for that route is complete, but removing this unused mandatory field remains follow-on work before claiming that exceptional applicant flow works end to end. Matching production activation and deployed verification remain after merge; broader002 required data remains unfinished. Two-account separation and additional internal-health setup checks remain waived by the user.
