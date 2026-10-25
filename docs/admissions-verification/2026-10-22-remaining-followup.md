# Score assessment, compact requirements, and remaining source gaps

Continuation of PR #229, approved on 22 October 2026. No live database writes, formula changes, or threshold changes are included.

## Score and confirmation separation

The public evaluator now defers only confirmations handled separately by the selected programme. The default capability matrix and official-source proof modes remain strict. Runtime score mode covers BGU Computer Science/Data Science, engineering, health, ordinary social-science routes, quantitative routes; TAU Computer Science, Management and Physiotherapy; Technion Architecture; Colman Computer Science's Bagrut route; and the second-department condition for Haifa Information Systems.

Actual numeric inputs, institution-specific averages, route-defining qualifications, source fingerprints and programme mappings remain required. Age-based and conditional-English BGU routes retain their existing checks. An unanswered confirmation produces a pending overall decision; a failed confirmation produces a below decision. Neither changes a verified numeric score into final admission. Unknown official sources remain unknown.

Comparison and legacy recommendation cards now use the existing shared compact admission component. Comparison uses the selected institution's requirements rather than the programme-wide fallback.

The hosted check also confirmed that shared catalogue rows can have empty notes. Legacy cards retain the institution-specific notes in that case; a shared row is used only when it supplies missing copy for the same institution. Institution aliases resolve by catalogue ID. This is a display lookup fix, not a new source-data repair.

Main's concurrent branding and SEO changes were integrated on this branch. SEO callers now await the live public catalogue, sharing its request-scoped load. Metadata uses current names; excluded saved references remain accessible but do not enter the sitemap. The directory keeps the verified destination registry and main's aggregator/board-link filtering.

## Thirteen incomplete requirement records

The follow-up distinguishes absence of published criteria from a confirmed absence of requirements. These records still cannot support an eligibility claim. The existing conservative guard remains in place.

| Record | Official-source follow-up | Finding / remaining dependency |
| --- | --- | --- |
| `mon_12341155561_business` | https://mc-college.co.il/ | Live HTTP 200 page identifies the Business Administration course but publishes no entry criteria or course-detail link. |
| `bishulim_cs` | https://www.bishulim-school.com/course/קורס-בישול-מקצועי/ | Beginner-oriented professional course; no complete additional entry criteria established. |
| `mon_12220697671_cs` | https://www.yvc.ac.il/admission/ and https://www.yvc.ac.il/degree/b-sc-in-information-systems-management/ | General degree routes are published, but the programme page does not supply the Information Systems department's thresholds. Preparatory-course requirements cannot replace degree requirements. |
| `mon_12220685573_cs` | https://www.estella.co.il/courses/מסלול-קונדיטוריה-מקצועי-expert/ | EXPERT curriculum identified; complete admission criteria not published on the reviewed page. |
| `mon_12341138289_cs` | https://lp.smart-college.co.il/qa/ | Admission heading contains marketing language, not assessable criteria. Requirements from the separate Full Stack course cannot be applied to QA. |
| `mon_12341122982_graphic_design` | https://www.leidaschool.co.il/ and https://www.leidaschool.co.il/--c247f | Doula course identity established; complete entrance criteria not established. |
| `mon_12341063909_graphic_design` | https://www.camera.org.il/ | Broad school entry covers distinct courses. Advanced photography requires prior knowledge, but that cannot be imposed on introductory courses. A specific course mapping is needed. |
| `mon_12341203461_graphic_design` | https://galitz.co.il/ | Broad photography entry does not identify one course. An older video-production syllabus cannot establish requirements for all current courses. |
| `mon_12341128804_medicine` | https://www.washington.ac.il/ links to https://www.washington.ac.il/teuda/adama/ | The parent identifies Adama. The linked school page is unavailable to the web reader (403); no complete course-specific entry criteria established. |
| `mon_12341137918_medicine` | https://www.tiltan-college.co.il/about explicitly links to https://www.tiltancollege.co.il/ | The two complementary-medicine sites are connected by the school's own migration link. This is distinct from the design college. The broad catalogue entry still needs a named course before course-specific prerequisites can be assigned. |
| `reidman_medicine` | https://www.reidman.co.il/לימודי-נטורופתיה and https://www.reidman.co.il/תקנונים | Current naturopathy page has no complete entry criteria. The 2026/27 registration regulations, section 2, reserve interviews at the college's discretion; they do not establish a mandatory interview for every applicant or publish the missing programme criteria. |
| `mon_12341143672_business` | https://nihulcollege.co.il/product/קורס-מנהל-עסקים-וניהול-כללי/ | The admission section describes a target audience, not minimum assessable requirements. |
| `mon_12341098628_business` | https://abs-school.com/mira/ | Programme audience and content are published; complete entry criteria are not established. |

No new live content repair is proposed from these findings. The next step for the unresolved criteria is a named-course decision for broad entries or confirmation from the institution. No institution was contacted on the user's behalf.

## Directory websites

Resolved `12341165867` (Gal Hadash): its [school-branded business card](https://digital-studio.co.il/galhadash/) explicitly links “our website” to https://galhadash.co.il/. The destination identifies the same school, history and contact details. The registry now uses that domain with the existing `utm_source=myway&utm_medium=referral` helper.

The other nine unresolved links from the 21 October audit remain withheld: Avni; DF Projects; MPireM; Asia Institute; FreeMedia; Lago Academy; F.D. Technological College; Raz Educational Challenges; and Tel Aviv High School Netanya. A similarly named school, a training partner, an aggregator listing or an inaccessible former domain is not sufficient to assign a current institution-owned website. In particular, fdcollege.co.il has not been established as either of the two distinct DF/F.D. directory identities, and the Netanya municipality page establishes the school identity but is not the school's own website.

## Verification

- Production build passed.
- Pre-PR guard: 1,131 tests passed, including migration, seed and operational grant checks.
- Focused comparison/account tests verify institution-specific compact requirements and expandable additional conditions.
- Existing lint warning in `bagrutPolicies.ts` is present at base HEAD; no unrelated cleanup included.
- Desktop/mobile preview verification and final commit evidence are recorded in the PR handoff after deployment.
- After integrating main: production build, typecheck, formatting and 56 focused directory, account, display and SEO compatibility tests passed.
- Hosted browser checks at 1440×900 and 390×844: BGU Communication uses saved psychometric 700 against its 520 route with outstanding conditions separate; a temporary save survives reload and was removed afterward. The original six saved-list rows were restored. Two-programme comparison, expanded conditions and the programme-specific contact form were exercised; no enquiry was submitted and no academic inputs were changed.

## UI verification steps

1. Open the calculator, select BGU Communication or another covered degree, and enter the scores required for that route. Leave independent registration/language confirmations unanswered. Expect a numeric match and separate outstanding conditions, without claiming final admission.
2. Open the saved list and reload. With the necessary saved score inputs, expect the same numeric result. Missing numeric inputs must still be requested.
3. Select two saved programmes for comparison. Expect compact bullets using each institution's requirements; expand “additional conditions” to see the rest.
4. Open the institution directory and search for Gal Hadash. Its website link must point to galhadash.co.il with MyWay referral parameters.
