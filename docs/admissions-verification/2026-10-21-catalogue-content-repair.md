# Catalogue identity and admission content repair — 21 October 2026

## Prepared changes

The original inventory has 96 programme/institution pairs. TAU Communication was repaired earlier. This patch researches the other 95: 93 receive source-linked Hebrew content and 2 unsupported degree listings are excluded from recommendations. All IDs and saved references remain intact.

21 programme identities are corrected, including music, acting, dance, doula training, complementary medicine and professional management courses. The directory also separates the design and complementary-medicine Tiltan institutions, corrects verified provider links, and puts Art of Birth in Tel Aviv instead of online-only. Official source URLs and SHA-256 receipts are recorded in `src/data/admissions/catalogueContentRepair.json`.

The SQL is a manually applied, drift-checked repair, not an automatic migration. It does not update numeric thresholds, formula configuration, admission facts, grades, saved programmes or verification fingerprints. No shared database changes have been applied for this patch.

## Remaining unpublished requirements

80 of the 93 entries have published conditions recorded. The following 13 remain incomplete; a verified programme identity is not proof of open admission. These programmes remain visible. No conditions have been invented.

| Programme ID | Institution | Gap |
| --- | --- | --- |
| `mon_12341155561_business` | המכללה לניהול וקריירה | זהו קורס ללימודי תעודה והכשרה מקצועית. תנאי הקבלה לקורס אינם מפורטים באתר; יש לברר אותם מול המכללה לפני ההרשמה. |
| `bishulim_cs` | בישולים – בית ספר ישראלי לאמנות הבישול | תנאי רישום נוספים אינם מפורטים בעמוד הקורס; יש לברר אותם מול בית הספר לפני ההרשמה. |
| `mon_12220697671_cs` | המכללה האקדמית עמק יזרעאל | נדרשים סיווג אנגלית, וסיווג עברית למי שנדרשים לכך. הספים המספריים למערכות מידע אינם מפורטים באתר; יש לקבלם ממרכז ההרשמה לפני הגשת מועמדות. |
| `mon_12220685573_cs` | אסטלה - קונדיטוריה | דרישות הקבלה למסלול הקונדיטוריה המקצועי אינן מפורטות באתר. יש לברר אותן עם בית הספר לפני ההרשמה. |
| `mon_12341138289_cs` | מכללת סמארט | דרישות הקבלה לקורס בדיקות תוכנה אינן מפורטות בעמוד הקורס. יש לברר אותן עם המכללה לפני ההרשמה. |
| `mon_12341122982_graphic_design` | בית הספר אמנות הלידה | דרישות הקבלה להכשרת דולות אינן מפורטות באתר. יש לברר אותן עם בית הספר לפני ההרשמה. |
| `mon_12341063909_graphic_design` | קמרה אובסקורה בית הספר לאמנות מבית רשת מכללות עתיד | תנאי הקבלה משתנים בין לימודי צילום, קולנוע וכתיבה. יש לבחור מסלול ולברר את דרישותיו עם בית הספר. |
| `mon_12341203461_graphic_design` | גליץ בית הספר לצילום | יש לבחור קורס צילום ולברר אם נדרשים ידע קודם או ציוד צילום. דרישות אחידות לכל הקורסים אינן מפורטות באתר. |
| `mon_12341128804_medicine` | 'אדמה'\- בית הספר לרפואה משלימה ותרפיות בגבעת ושינגטון | דרישות הקבלה למסלולי הרפואה המשלימה אינן מפורטות באתר הקריה. יש לבחור מסלול ולברר את תנאיו עם בית הספר אדמה. |
| `mon_12341137918_medicine` | מכללת תילתן המכללה לרפואה משלימה | יש לבחור מסלול ברפואה משלימה ולברר את תנאי הקבלה שלו עם המכללה. אין באתר תנאי קבלה אחידים לכל המסלולים. |
| `reidman_medicine` | מכללת רידמן | דרישות הקבלה לנטורופתיה אינן מפורטות בעמוד המסלול. יש לברר אותן עם המכללה; למסלולים אחרים ברפואה משלימה עשויות להיות דרישות שונות. |
| `mon_12341143672_business` | המכללה לניהול -חיפה | הקורס מיועד למנהלים, לבעלי עסקים ולמי שמעוניינים להשתלב בניהול. דרישות סף מחייבות אינן מפורטות בעמוד הקורס; יש לברר אותן עם המכללה. |
| `mon_12341098628_business` | A.B.S - בית הספר למסחר, יזמות ועסקים | תנאי הקבלה לקורס מנהל עסקים אינם מפורטים באתר. יש לברר אותם עם בית הספר לפני ההרשמה. |

## Conservative eligibility correction — approved

A focused request to the local production API with Bagrut 110 and psychometric 700 returned `eligible_to_apply` / high confidence for Art of Birth, Estella, MC College and ABS despite their unpublished requirements. The imported facts and evidence include unverified claims such as no Bagrut/psychometric gate and a mandatory interview. Adding explanatory copy cannot correct that decision. With empty grades, the doula journey instead asks for a Bagrut average.

The user approved a conservative result guard for the 13 incomplete programme/institution pairs. The evaluator now returns an unknown requirements-only result before input gates or legacy admission claims run. It does not calculate an admission score or invent requirements. Discovery and saves remain available; the journey places these results in exploration, labels them `עדיין לא ניתן לקבוע התאמה`, and omits the misleading grade-completion and alternative-admission prompts. The admission section retains the researched information without a duplicate explanation. Numeric formulas, thresholds and stored facts are unchanged. The 13 incomplete source records remain incomplete; this fix prevents false eligibility rather than claiming to fill their missing criteria.

A separate official-source discrepancy also remains: the current Technion English page says **104 and above**, while the reviewed artifact/adapter expects **above 104**. This patch records the official wording in display content but does not change the calculator contract. Source: https://admissions.technion.ac.il/english-exam/ .

## Verification

- Disposable PostgreSQL: 209 targeted operations (93 notes, 93 source links including 2 inserts, 21 identities, 2 listing flags); exact values checked; all other columns preserved; second application identical; external note edits correctly rejected. Transaction-only test followed by staging in the disposable localhost database.
- Production API from the disposable database: all 93 pairs have the expected notes and URLs, all 21 identities match, both excluded IDs remain present and unlisted.
- Before the eligibility correction, 35 focused tests passed: content/seeding, directory identity and location, journey helpers. Existing guard: 1,094 tests pass. Production build and typecheck pass; lint has the same existing unused-import warning in bagrutPolicies.ts.
- Real browser: public pages for doula training, HR management, Education, Maale film, Tiltan complementary medicine and BGU Psychology. Clicked disclosure, keyboard Enter expansion, calculator entry, course search, selection, course filter and detail.
- Responsive inspection: actual browser widths measured at 1440 and 390; no horizontal overflow and inspected Hebrew headings/lists/disclosures right-aligned. Screenshots under the local `myway-ui-correction-review/admission-disclosure` gallery.
- The first attempted mobile capture was still desktop-sized; it was replaced with a verified 390px capture.
- Account data was not changed. This local browser check used an anonymous session and the disposable database; it does not re-verify authenticated cloud persistence.

## Eligibility verification

- 156 focused tests pass across evaluator, journey labels and saved-account behaviour. All 13 incomplete pairs are exercised with empty, high and low grades; no score, threshold, missing-input prompt or unsupported interview/grade claim is returned. The input catalogue is unchanged.
- The local production API, using the disposable database and its real imported facts, passed all 39 evaluations (13 pairs × three grade scenarios).
- Production build, typecheck, formatting and required guard pass (1,108 tests). Lint has only the pre-existing bagrutPolicies.ts unused-import warning. Logs are in the local admission-disclosure evidence directory.
- Real browser at 1440px and 390px: doula result with empty grades and then test grades 110/700 remains unknown; no grade-completion/alternative-admission prompt, no horizontal overflow, Hebrew right-aligned. Saved the course in the anonymous local session, reloaded its saved list at mobile width, opened details, and removed the temporary save. No real account data changed. Screenshots: eligibility-desktop.png, eligibility-mobile.png and eligibility-saved-mobile.png.

## Review steps

1. Open http://localhost:4190/programs/bgu_psychology. Read the three primary conditions, then expand `תנאים נוספים`; the remaining conditions should appear without losing the primary ones. Repeat at mobile width.
2. Open http://localhost:4190/programs/mon_12220697938_graphic_design. The heading should be קולנוע, with Bagrut, portfolio, written exam and interview conditions and a direct Maale link.
3. In the calculator, search דולות, select הכשרת דולות, then choose all Israel and courses. Art of Birth should appear and its details should link to leidaschool.co.il. Its result should say `עדיין לא ניתן לקבוע התאמה`, with no grade-completion prompt or claim of eligibility. Save it locally and reload the saved list: the same conservative result should return.
4. In the institution directory, the two verified Tiltan colleges should have separate identities and correct official websites.

## Release state

Prepared on `fix/myway-ui-consistency`; no production deployment or shared data repair. The eligibility correction is approved; the 209-operation shared data repair still needs separate live-data approval. No new PR: six unrelated PRs are open, so the one-PR rule prevents creating another.
