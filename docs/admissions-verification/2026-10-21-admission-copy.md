# Admission copy and public programme pages

## Verified cause and scope

The public programme page read only `program.admissionRequirements`. The catalogue also stores institution-specific `specificAdmissionNotes`; these were already used by the journey detail screen but ignored on public programme pages. A read-only scan of the database-backed catalogue found 114 listed programme pages whose generic placeholder can be replaced by their existing institution notes. This is a display correction, not a claim that every stored note has been independently re-researched.

The journey scan covered 253 visible programme/institution options after normal de-duplication. Of those, 96 still had missing requirements or generic automated admissions descriptions. Filling every one requires a separate catalogue research decision, requested from the user. The inventory below records the affected options rather than claiming them fixed.

## Communication — verified official source

- Source: https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements
- Semester: A, 2026–2027. Official page says information current to 2026-01-28; retrieved 2026-10-21.
- Captured HTML SHA-256: `a6c35396460eca009222e2952e6b790636c79711c9b64f56fd4d8faa78d3674e`.
- The source provides score-based, Bagrut-only, psychometric-plus-Bagrut, prior-degree and partial-academic-study routes. The copy keeps alternatives separate and includes the double-major and registration conditions.
- Wording is stored under the TAU institution detail, not under the shared programme-wide requirements. It must not appear as BGU or Haifa requirements.
- No calculator thresholds, formulas, structured gates or admission decisions were changed. Alternative routes retain their existing evaluation behavior.

The database-backed journey needs the two-row `2026-10-21-communication-copy-repair.sql`: update `communication:tau` descriptive notes and its `program` source URL. It was tested in disposable PostgreSQL, including idempotency, preservation of every other field, and rejection after unexpected edits. Live application is pending explicit user approval because preview and production share the database.

## Shared display correction

Each institution has its own requirements section on the public programme page. Existing stored notes take precedence over the generic placeholder, and a source link accompanies each section. Unlisted programmes keep their withdrawn-information message. Programmes without linked institutions retain their existing general requirements. No static fallback replaces a failed database read.

## Verification

- Existing focused page/display/seed tests: 25 passed.
- Regression cases: existing TAU engineering notes are visible; Communication routes and the direct official link render; requirements and links stay with their institution in a multi-institution programme.
- Typecheck, lint, formatting and production build passed. Lint retains the pre-existing unused `AdmissionsRequiredInput` warning.
- Browser baseline reproduced on `/programs/tau_ee`: the page showed generic text despite stored notes. Desktop/mobile after screenshots and preview verification are recorded in the local review gallery.

User check: open `/programs/tau_ee` and `/programs/technion_civil`; the existing institution notes should appear. Once the approved content repair is applied, open `/programs/communication` and its TAU journey detail; the sourced alternatives should appear with the direct official link. Repeat at phone width.

## Missing/generic source-record inventory

This is an observed-gap inventory, not an assertion that a programme is offered or that its requirements have been verified.

| Programme ID | Institution ID | Display field |
| --- | --- | --- |
| `architecture` | `technion` | אדריכלות |
| `mon_12341137305_cs` | `mon_12341137305` | בדיקות תוכנה |
| `mon_12341108218_cs` | `mon_12341108218` | ברמנים |
| `wingate_cs` | `wingate` | חינוך גופני |
| `education` | `tau` | חינוך והוראה |
| `education` | `bgu` | חינוך והוראה |
| `haifa_accounting` | `haifa` | חשבונאות |
| `tau_accounting` | `tau` | חשבונאות |
| `huji_accounting` | `huji` | חשבונאות |
| `bgu_accounting` | `bgu` | חשבונאות |
| `ariel_economics` | `ariel` | כלכלה |
| `haifa_politicalscience` | `haifa` | מדע המדינה |
| `political_science` | `tau` | מדע המדינה |
| `political_science` | `bgu` | מדע המדינה |
| `hit_cs` | `hit` | מדעי המחשב |
| `mon_12220708940_cs` | `mon_12220708940` | מדעי המחשב |
| `mon_12220708941_cs` | `mon_12220708941` | מדעי המחשב |
| `mon_12220708942_cs` | `mon_12220708942` | מדעי המחשב |
| `ruppin_cs` | `ruppin` | מדעי המחשב |
| `mon_12220697668_cs` | `sapir` | מדעי המחשב |
| `mon_12220685569_cs` | `mon_12220685569` | מדעי המחשב |
| `mon_12341101519_cs` | `netanya` | מדעי המחשב |
| `mon_12341088622_cs` | `mon_12341088622` | מדעי המחשב |
| `datascience` | `technion` | מדעי הנתונים |
| `mon_12220697934_cs` | `mon_12220697934` | מוזיקה והפקה |
| `bgu_business` | `bgu` | מנהל עסקים |
| `huji_business` | `huji` | מנהל עסקים |
| `tau_business` | `tau` | מנהל עסקים |
| `mon_12341126565_business` | `mon_12341126565` | מנהל עסקים |
| `mon_12341143672_business` | `mon_12341143672` | מנהל עסקים |
| `mon_12341098628_business` | `mon_12341098628` | מנהל עסקים |
| `mon_12341134448_business` | `mon_12341134448` | מנהל עסקים |
| `mon_12341155561_business` | `mon_12341155561` | מנהל עסקים |
| `mon_12220697671_cs` | `emek_yezreel` | מערכות מידע |
| `beit_zvi_cs` | `beit_zvi` | משחק |
| `bgu_law` | `bgu` | משפטים |
| `biu_law` | `biu` | משפטים |
| `huji_law` | `huji` | משפטים |
| `tau_law` | `tau` | משפטים |
| `mon_12341185928_cs` | `mon_12341185928` | מתמטיקה ומדעי המחשב עם תעודת הוראה |
| `haifa_infosystems` | `haifa` | ניהול ומערכות מידע |
| `ariel_health_systems` | `ariel` | ניהול מערכות בריאות |
| `haifa_sociology` | `haifa` | סוציולוגיה |
| `mon_12341101353_cs` | `mon_12341101353` | סייבר ואבטחת מידע |
| `mon_12341147475_cs` | `mon_12341147475` | סייבר ואבטחת מידע |
| `mon_12341175059_cs` | `mon_12341175059` | סייבר ואבטחת מידע |
| `nursing` | `tau` | סיעוד |
| `rubin_graphic_design` | `rubin` | עיצוב ואומנויות |
| `bezalel_graphic_design` | `bezalel` | עיצוב ואומנויות |
| `jerusalem_academy_graphic_design` | `jerusalem_academy` | עיצוב ואומנויות |
| `mon_12220696298_graphic_design` | `mon_12220696298` | עיצוב ואומנויות |
| `mon_12220685575_graphic_design` | `mon_12220685575` | עיצוב ואומנויות |
| `spieldocs_graphic_design` | `spieldocs` | עיצוב ואומנויות |
| `minshar_graphic_design` | `minshar` | עיצוב ואומנויות |
| `mon_12220697938_graphic_design` | `mon_12220697938` | עיצוב ואומנויות |
| `nativ_graphic_design` | `nativ` | עיצוב ואומנויות |
| `mon_12220697940_graphic_design` | `mon_12220697940` | עיצוב ואומנויות |
| `mon_12220699120_graphic_design` | `mon_12220699120` | עיצוב ואומנויות |
| `mon_12341063909_graphic_design` | `mon_12341063909` | עיצוב ואומנויות |
| `mon_12341101957_graphic_design` | `mon_12341101957` | עיצוב ואומנויות |
| `mon_12341064485_graphic_design` | `mon_12341064485` | עיצוב ואומנויות |
| `mon_12341092879_graphic_design` | `mon_12341092879` | עיצוב ואומנויות |
| `mon_12341150395_graphic_design` | `mon_12341150395` | עיצוב ואומנויות |
| `mon_12341122982_graphic_design` | `mon_12341122982` | עיצוב ואומנויות |
| `mon_12341149221_graphic_design` | `mon_12341149221` | עיצוב ואומנויות |
| `mon_12341203461_graphic_design` | `mon_12341203461` | עיצוב ואומנויות |
| `physiotherapy` | `tau` | פיזיותרפיה |
| `physiotherapy` | `bgu` | פיזיותרפיה |
| `mon_12341113400_cs` | `mon_12341113400` | פיתוח תוכנה |
| `bgu_psychology` | `bgu` | פסיכולוגיה |
| `biu_psychology` | `biu` | פסיכולוגיה |
| `ariel_psychology` | `ariel` | פסיכולוגיה |
| `pharmacy` | `huji` | פרמציה |
| `bishulim_cs` | `bishulim` | קולינריה |
| `mon_12220685573_cs` | `mon_12220685573` | קונדיטוריה |
| `hackeru_cs` | `hackeru` | קורסי הייטק |
| `mon_12341167899_cs` | `mon_12341167899` | קורסי הייטק |
| `mon_12341138289_cs` | `mon_12341138289` | קורסי הייטק |
| `johnbryce_cs` | `johnbryce` | קורסי הייטק |
| `biu_criminology` | `biu` | קרימינולוגיה |
| `criminology` | `biu` | קרימינולוגיה |
| `ariel_criminology` | `ariel` | קרימינולוגיה |
| `occupational_therapy` | `bgu` | ריפוי בעיסוק |
| `occupational_therapy` | `haifa` | ריפוי בעיסוק |
| `medicine` | `biu` | רפואה |
| `mon_12341128804_medicine` | `mon_12341128804` | רפואה ומקצועות הבריאות |
| `mon_12341137918_medicine` | `mon_12341137918` | רפואה ומקצועות הבריאות |
| `reidman_medicine` | `reidman` | רפואה ומקצועות הבריאות |
| `nutrition` | `ariel` | תזונה ודיאטטיקה |
| `nutrition` | `huji` | תזונה ודיאטטיקה |
| `colman_tourism` | `colman` | תיירות ומלונאות |
| `haifa_communication` | `haifa` | תקשורת |
| `ariel_communication` | `ariel` | תקשורת |
| `communication` | `tau` | תקשורת ועיתונאות |
| `communication` | `bgu` | תקשורת ועיתונאות |
| `communication` | `haifa` | תקשורת ועיתונאות |
