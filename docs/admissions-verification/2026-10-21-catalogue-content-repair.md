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

## Observed eligibility blocker — decision requested

A focused request to the local production API with Bagrut 110 and psychometric 700 returned `eligible_to_apply` / high confidence for Art of Birth, Estella, MC College and ABS despite their unpublished requirements. The imported facts and evidence include unverified claims such as no Bagrut/psychometric gate and a mandatory interview. Adding explanatory copy cannot correct that decision. With empty grades, the doula journey instead asks for a Bagrut average.

A conservative result guard for the 13 incomplete pairs has been proposed to the user: retain discovery and saved links, return an unknown requirements-only result, and omit unsupported legacy claims. No evaluator change has been made pending approval because the original scope prohibited admission-logic changes. This content repair must not be described as a complete admissions fix.

A separate official-source discrepancy also remains: the current Technion English page says **104 and above**, while the reviewed artifact/adapter expects **above 104**. This patch records the official wording in display content but does not change the calculator contract. Source: https://admissions.technion.ac.il/english-exam/ .

## Verification

- Disposable PostgreSQL: 209 targeted operations (93 notes, 93 source links including 2 inserts, 21 identities, 2 listing flags); exact values checked; all other columns preserved; second application identical; external note edits correctly rejected. Transaction-only test followed by staging in the disposable localhost database.
- Production API from the disposable database: all 93 pairs have the expected notes and URLs, all 21 identities match, both excluded IDs remain present and unlisted.
- 35 focused tests pass: content/seeding, directory identity and location, journey helpers. Existing guard: 1,094 tests pass. Production build and typecheck pass; lint has the same existing unused-import warning in bagrutPolicies.ts.
- Real browser: public pages for doula training, HR management, Education, Maale film, Tiltan complementary medicine and BGU Psychology. Clicked disclosure, keyboard Enter expansion, calculator entry, course search, selection, course filter and detail.
- Responsive inspection: actual browser widths measured at 1440 and 390; no horizontal overflow and inspected Hebrew headings/lists/disclosures right-aligned. Screenshots under the local `myway-ui-correction-review/admission-disclosure` gallery.
- The first attempted mobile capture was still desktop-sized; it was replaced with a verified 390px capture.
- Account data was not changed. This local browser check used an anonymous session and the disposable database; it does not re-verify authenticated cloud persistence.

## Review steps

1. Open http://localhost:4190/programs/bgu_psychology. Read the three primary conditions, then expand `תנאים נוספים`; the remaining conditions should appear without losing the primary ones. Repeat at mobile width.
2. Open http://localhost:4190/programs/mon_12220697938_graphic_design. The heading should be קולנוע, with Bagrut, portfolio, written exam and interview conditions and a direct Maale link.
3. In the calculator, search דולות, select הכשרת דולות, then choose all Israel and courses. Art of Birth should appear and its details should link to leidaschool.co.il. Its eligibility message remains blocked by the decision above.
4. In the institution directory, the two verified Tiltan colleges should have separate identities and correct official websites.

## Release state

Prepared on `fix/myway-ui-consistency`; no production deployment or shared data repair. Additional live data approval is required after the eligibility decision and resulting verification. No new PR: six unrelated PRs are open, so the one-PR rule prevents creating another.
