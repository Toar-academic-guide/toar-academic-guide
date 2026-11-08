# Issue 379 catalogue reconciliation

The directory uses the public catalogue and individually identified official programme pages. An official field listing can establish a broad-field match without establishing a specific programme. Only individual offerings count towards a school's displayed total. A school with no identified offering stays visible in the initial directory with an em dash for its count.

## Input and coverage

On 7 November 2026 the public [programme API](https://findmyway.co.il/api/catalog/programs) returned 405 records and reported its database source. The raw response data matched the 6 November snapshot. The [institution API](https://findmyway.co.il/api/catalog/institutions) returned 254 records in the comparison snapshot. The programme endpoint also includes a code-backed supplement of 11 calculator groups. A successful database read precedes public legacy-link composition.

The comparison projection contained 210 institutions, 32 fields, 177 programme choices and 348 institution/individual programme pairs. These are counts of identified catalogue offerings, not the total number of programmes taught nationally. 72 institutions currently have no individual programme in this projection. 11 also lack a verified field. Runtime counts are derived from the current catalogue.

- [All 161 original candidate records](issue-379/candidate-dispositions.csv) give the old ID, provider, label, input source, decision and available source pointer. Of these, 140 came through compatibility composition, 11 are calculator groups, and 10 are persisted rows. A homepage pointer identifies a source used for research; it is not evidence of a particular degree.
- [Field evidence](issue-379/field-sources.csv) records 192 individual field associations. Fields come from named courses or study areas on official sites. No field is assigned from an institution name or a keyword in its URL.
- [The resulting offering inventory](issue-379/offerings.csv) records the programme identity or external URL, provider ID, label, subject key, field and destination. Internal links resolve to catalogue programme pages. Independently sourced offerings without an internal record link directly to the official page. This keeps unsupported programme IDs out of calculations and enquiry forms.
- The new official programme list includes 82 inspected programme destinations from the original candidate research, in addition to the specifically reconciled software engineering, Kinneret sound, BDO, Smart and John Bryce pages. Source index labels were checked against programme pages. General catalogues and links that did not establish a distinct programme remain field evidence only.

## Shared identity corrections

A read-only query of the hosted `programs` table confirmed the five existing, listed records below, including Arti's stored academic type. [Exact identity payload](issue-379/identity-payload.csv) shows the stored and reviewed names, types and categories. The existing content repair handles these fields in serialization and in fresh seed data where the record exists. The directory can display a verified official link when a record is absent. The shared database was not written or reseeded.

| Provider | Corrected programme | Official evidence |
|---|---|---|
| Arti | Interior design, certificate | [Programme](https://www.arti-studio.co.il/עיצוב-פנים-1/) |
| Studio 6B | Graphic design and UX/UI, certificate | [Haifa course](https://www.6bstudio.co.il/graphicuxui2026/) |
| Minshar | Visual communication, certificate | [Programme admissions](https://www.minshar.org.il/visual-communication/acceptance-tasks/) and [optional degree pathway](https://www.minshar.org.il/ba-studies/) |
| Smart College | Software testing, certificate course | [QA course](https://lp.smart-college.co.il/qa/) |
| John Bryce | DevOps, certificate course | [DevOps course](https://www.johnbryce.co.il/catalog/hi-tech-courses/קורס-devops/) |

The remaining 156 original records name broad groups and do not establish a single course. Their IDs and existing calculator logic are preserved. The 11 calculator groups and Danon's [culinary department](https://www.danon.org.il/cuisine/) retain reachable links as fields on institution pages. The general Danon page does not add another offering alongside the named programmes. The older John Bryce “Cloud & DevOps” entry points to the school homepage and has no independent source for a second offering. At CLB the two IDs for [business administration](https://clb.ac.il/management/) use the same provider and qualification. The directory prefers the record with programme-specific admissions evidence when both exist.

Music and dance degree labels use the same subject name as their discipline while retaining the academic/certificate distinction. BIU medicine retains the Safed campus title on the actual programme link and matches the medicine pill. Where a general and a provider-specific medicine record represent the same programme, only the specific one is counted.

## Provider identity

Monday item IDs map to their established directory identity. Branch locations can contribute to the area filter. Distinct schools keep separate rows. [Academic Kinneret](https://do.kinneret.ac.il/) and [Technical Kinneret](https://www.ktec.co.il/) offer different qualifications. The technical school's [sound programme](https://www.ktec.co.il/schools/הנדסת-קול/) leads to a practical engineering diploma. The old sound ID remains in the admissions system, and its public programme URL leads to the correct technical institution. The [Ruppin](https://www.ruppin-tech.co.il/) and [Tel Hai](https://www.telhai.tech/) technical colleges are also distinct from their academic counterparts. Tel Hai's academic directory row combines its Kiryat Shmona identity based on the [Council for Higher Education decision](https://che.org.il/wp-content/uploads/2026/01/החלטות-מועצה-מישיבתה-20.1.2026-1.pdf).

The two specifically identified Tiltan providers remain separate. [Etgar's college](https://etgar.org.il/), [Laledet](https://laledetschool.co.il/) and [Mediteva](https://www.mediteva.com/) have updated official destinations. The old Etgar destination belongs to an investment business. The old Laledet destination did not contain the college's programme catalogue.

## Remaining source gaps

The following institutions stay in the initial directory. Current first-party evidence did not establish an in-scope field or individual programme for them. A read-only check of these exact 11 Monday items, their source columns, updates and subitems found directory/aggregator references and no new official programme URLs. The institution website registry and its [prior source audit](../admissions-verification/2026-10-21-institution-links.md) were checked alongside available current sources. No negative claim is made about what these institutions offer.

| ID | Institution |
|---|---|
| `mon_12341148361` | "מה כתבת?" (לימודי גרפולוגיה ופענוח ציורים) |
| `mon_12341148232` | אמפייר אם – האקדמיה למצוינות במקצועות היופי |
| `mon_12341162554` | המכון לאסיה |
| `mon_12220696299` | מכון אבני |
| `mon_12341203959` | מכללה טכנולוגית F.D |
| `mon_12341127690` | מכללת ארז |
| `mon_12341091770` | מכללת DF פרויקטים והכשרות |
| `mon_12341203595` | רז אתגרים חינוכיים |
| `mon_12341189852` | תיכון תל אביב \- סניף נתניה |
| `mon_12341167263` | FREE MEDIA |
| `mon_12341138306` | LAGO ACADEMY |

The municipal listing for [Tel Aviv High School in Netanya](https://www.netanya.muni.il/Residents/Education/SecondaryEducation/SSchools/Pages/tichontelaviv.aspx) confirms a secondary school, not a particular tertiary programme. The two similarly named F.D/DF records have no established equivalence. LAGO's venue, old directory listings, commercial profile pages and defunct school domains were not used as programme evidence. FREE MEDIA already lacked a programme before this change.

## Verification

Compare the Hebrew pill labels, counts and links at 1280px and 390px. Start without a subject, select engineering then software engineering, and open Afeka's catalogue programme or another provider's official programme. Clear the programme, change the field, and confirm the selection resets. Combine with region or institution name to exercise the empty state. A field sourced from an institution's catalogue may link to the official listing while its individual count stays unavailable.

The source replay and the database-backed preview both returned 210 institutions, 32 fields, 177 programme choices and 348 provider/programme pairs. On the [verified deployment](https://toar-academic-guide-2lnw4n1kl-amitm1630-6681s-projects.vercel.app/institutions) for commit `6c1fe0a`, the rendered table contained 210 distinct rows, seven institutions matched software engineering, and the API returned the five reviewed names and qualifications. Arti's programme page rendered “עיצוב פנים”. Read-only Supabase verification found exactly ten physical listed records among the 161 candidates. No production data was changed.

[Desktop screenshot](issue-379/desktop.png) · [Mobile screenshot](issue-379/mobile.png) · [PR #393](https://github.com/Toar-academic-guide/toar-academic-guide/pull/393)
