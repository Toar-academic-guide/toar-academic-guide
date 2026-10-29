# H1/H2 production diff against7e84aff

H1 includes the Latin fallback. H2 changes only the authorized metadata/dispatch plus its policy helper; unresolved mappings/unsupported programmes retain their own states under ruling(b).

```diff
diff --git a/src/components/CalculatorResults.tsx b/src/components/CalculatorResults.tsx
index 6173f42..0eb7883 100644
--- a/src/components/CalculatorResults.tsx
+++ b/src/components/CalculatorResults.tsx
@@ -3,7 +3,12 @@
 import AdmissionEstimate from './AdmissionEstimate';
 import TechnionThresholdNotice from './TechnionThresholdNotice';
 import TechnionMedicineComparison from './TechnionMedicineComparison';
-import { isTechnionMedicineScore, resultLabel } from '@/lib/studyJourney';
+import {
+  isTechnionMedicineScore,
+  resultLabel,
+  resultSourceLinks,
+  resultExplanation,
+} from '@/lib/studyJourney';
 import AdmissionConditions from './AdmissionConditions';
 import { acceptedManualGateFootnote } from '@/lib/acceptedManualGateFootnote';

@@ -844,6 +849,7 @@ export default function CalculatorResults({
                     : config.label;
                   const institutionType = getInstitutionType(institution);
                   const sourceUrl = institutionLink(result.officialUrls?.[0], institution.id);
+                  const sourceLinks = resultSourceLinks(result, institution.programUrl);

                   return (
                     <div
@@ -873,7 +879,9 @@ export default function CalculatorResults({
                                 {result.sourceLabel}
                               </p>
                               <p className="mt-1 text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
-                                {result.explanation}
+                                {sourceLinks
+                                  ? resultExplanation(result, degreeId)
+                                  : result.explanation}
                               </p>
                             </>
                           )}
@@ -902,7 +910,19 @@ export default function CalculatorResults({
                           {!footnote && (
                             <AdmissionConditions conditions={result.additionalConditions} />
                           )}
-                          {sourceUrl && !result.floorChecks ? (
+                          {sourceLinks ? (
+                            sourceLinks.map(({ href, label }) => (
+                              <a
+                                key={href}
+                                href={href}
+                                target="_blank"
+                                rel="noopener noreferrer"
+                                className="mt-1 mr-3 inline-block max-w-full truncate text-right text-[11px] font-semibold text-[#4f46e5] underline decoration-[#a5b4fc] underline-offset-2 hover:text-[#3730a3]"
+                              >
+                                {label}
+                              </a>
+                            ))
+                          ) : sourceUrl && !result.floorChecks ? (
                             <a
                               href={sourceUrl}
                               target="_blank"
diff --git a/src/components/StudyJourney.tsx b/src/components/StudyJourney.tsx
index ed2bc93..6c96e25 100644
--- a/src/components/StudyJourney.tsx
+++ b/src/components/StudyJourney.tsx
@@ -42,6 +42,7 @@ import {
   groupJourneyRows,
   resultLabel,
   resultExplanation,
+  resultSourceLinks,
   isTechnionMedicineScore,
   formatJourneyScore,
   officialUrl,
@@ -445,6 +446,7 @@ export default function StudyJourney({
       activeRow?.institution.programUrl,
     activeRow?.institution.id,
   );
+  const activeSourceLinks = resultSourceLinks(activeRow?.result, activeOfficialUrl);
   const description = catalogueDescription(details?.programDescription);
   const counts = useMemo(() => {
     const sets: Partial<Record<JourneyLocation, Set<string>>> = {};
@@ -748,6 +750,7 @@ export default function StudyJourney({
   const groups = groupJourneyRows(visibleRows, groupBy);
   const rowView = (row: JourneyRow) => {
     const status = resultLabel(row.result, row.failed, calculating && !row.result, row.program.id);
+    const sourceLinks = resultSourceLinks(row.result, row.institution.programUrl);
     return (
       <article className="journey-result-row" key={row.id}>
         <div className="journey-row-info">
@@ -763,6 +766,28 @@ export default function StudyJourney({
           >
             {status.label}
           </span>
+          {sourceLinks && (
+            <>
+              <p className="journey-result-explanation">
+                {resultExplanation(row.result, row.program.id)}
+              </p>
+              <div className="journey-links">
+                {sourceLinks.map(({ href, label }) => (
+                  <ProgramTrackedLink
+                    key={href}
+                    event="institution_site_clicked"
+                    programId={row.program.id}
+                    institutionId={row.institution.id}
+                    target="_blank"
+                    rel="noopener noreferrer"
+                    href={href}
+                  >
+                    {label}
+                  </ProgramTrackedLink>
+                ))}
+              </div>
+            </>
+          )}
           {isTechnionMedicineScore(row.result, row.program.id) && !row.failed && (
             <TechnionMedicineComparison score={row.result.score} />
           )}
@@ -1521,18 +1546,32 @@ export default function StudyJourney({
                           <button onClick={() => go('alternatives')}>עוד דרכי קבלה</button>
                         </>
                       )}
-                    {activeOfficialUrl && (
-                      <ProgramTrackedLink
-                        event="institution_site_clicked"
-                        programId={activeRow.program.id}
-                        institutionId={activeRow.institution.id}
-                        target="_blank"
-                        rel="noopener noreferrer"
-                        href={activeOfficialUrl}
-                      >
-                        לאתר המוסד
-                      </ProgramTrackedLink>
-                    )}
+                    {activeSourceLinks
+                      ? activeSourceLinks.map(({ href, label }) => (
+                          <ProgramTrackedLink
+                            key={href}
+                            event="institution_site_clicked"
+                            programId={activeRow.program.id}
+                            institutionId={activeRow.institution.id}
+                            target="_blank"
+                            rel="noopener noreferrer"
+                            href={href}
+                          >
+                            {label}
+                          </ProgramTrackedLink>
+                        ))
+                      : activeOfficialUrl && (
+                          <ProgramTrackedLink
+                            event="institution_site_clicked"
+                            programId={activeRow.program.id}
+                            institutionId={activeRow.institution.id}
+                            target="_blank"
+                            rel="noopener noreferrer"
+                            href={activeOfficialUrl}
+                          >
+                            לאתר המוסד
+                          </ProgramTrackedLink>
+                        )}
                     <ProgramShareButton
                       key={activeRow.program.id}
                       programId={activeRow.program.id}
diff --git a/src/lib/studyJourney.ts b/src/lib/studyJourney.ts
index 116ee22..dfff032 100644
--- a/src/lib/studyJourney.ts
+++ b/src/lib/studyJourney.ts
@@ -1,3 +1,4 @@
+import { institutionLink } from '@/lib/institutionLinks';
 import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
 import { FIELD_ENRICHMENT, PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';
 import { DANON_PROGRAM_NAMES } from '@/data/admissions/danon';
@@ -311,14 +312,19 @@ export function resultExplanation(
   if (result.degradationReason === 'incomplete_published_requirements') return undefined;
   if (result.linkedInstitutionId === 'danon' && result.kind === 'requirements_only')
     return undefined;
+  if (result.kind === 'tracked_missing_rule' || result.kind === 'authority_unavailable') {
+    if (result.explanation.trim() && !/[a-zA-Z]/.test(result.explanation))
+      return result.explanation;
+    return result.kind === 'authority_unavailable'
+      ? 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.'
+      : 'אין כרגע חישוב קבלה מאומת למסלול הזה. אפשר לבדוק את התנאים העדכניים באתר המוסד.';
+  }
   switch (result.kind) {
     case 'requirements_only':
-    case 'tracked_missing_rule':
     case 'unsupported':
       if (isBatchCUnsupportedProgramId(programId ?? '', result.linkedInstitutionId))
         return result.explanation;
       return 'אין כרגע חישוב קבלה מאומת למסלול הזה. אפשר לבדוק את התנאים העדכניים באתר המוסד.';
-    case 'authority_unavailable':
     case 'degraded':
       return 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.';
     case 'manual_gate':
@@ -357,3 +363,15 @@ export function groupJourneyRows(rows: JourneyRow[], groupBy: 'field' | 'institu
 }

 export { institutionLink as officialUrl } from '@/lib/institutionLinks';
+
+export function resultSourceLinks(result?: AdmissionsEvaluationResult, fallbackUrl?: string) {
+  if (result?.kind !== 'tracked_missing_rule' && result?.kind !== 'authority_unavailable')
+    return undefined;
+  const hasSources = Boolean(result.officialUrls?.length);
+  return (hasSources ? result.officialUrls! : [fallbackUrl]).flatMap((source, index) => {
+    const href = institutionLink(source, result.linkedInstitutionId);
+    return href
+      ? [{ href, label: hasSources ? (index === 0 ? 'למקור הרשמי' : 'למקור נוסף') : 'לאתר המוסד' }]
+      : [];
+  });
+}
diff --git a/src/server/admissions/evaluator.ts b/src/server/admissions/evaluator.ts
index f32e0d0..dba07a8 100644
--- a/src/server/admissions/evaluator.ts
+++ b/src/server/admissions/evaluator.ts
@@ -198,6 +198,7 @@ export async function evaluateAdmissionsForProgram(args: {

   const results = await evaluateCapabilityEntries({
     input: evaluationInput,
+    haifaAverageIsProxy: normalized.proxyInstitutions.has('haifa'),
     program,
     institutions,
     capabilityEntries,
@@ -331,6 +332,7 @@ function withVerifiedAdmissionInformation(

 async function evaluateCapabilityEntries(args: {
   input: AdmissionsEvaluationRequest;
+  haifaAverageIsProxy: boolean;
   program: CatalogueProgram;
   institutions: CatalogueInstitution[];
   capabilityEntries: AdmissionsCapabilityEntry[];
@@ -347,9 +349,19 @@ async function evaluateCapabilityEntries(args: {
       continue;
     }

-    if (institution.id === 'haifa' && input.extraInputs?.haifaBagrutAverage === undefined) {
-      results[index] = haifaMissingRuleResult(program.id, publicInstitutionShape(institution));
-      continue;
+    if (
+      institution.id === 'haifa' &&
+      (args.haifaAverageIsProxy || input.extraInputs?.haifaBagrutAverage === undefined)
+    ) {
+      const missingRule = haifaMissingRuleResult(program.id, publicInstitutionShape(institution), {
+        averageIsProxy: args.haifaAverageIsProxy,
+        capability: entry.capability,
+        input,
+      });
+      if (missingRule) {
+        results[index] = missingRule;
+        continue;
+      }
     }

     if (isBiuPublishedRoutePair(program.id, institution.id)) {
diff --git a/src/server/admissions/haifaProgrammePolicy.ts b/src/server/admissions/haifaProgrammePolicy.ts
index b9b4982..b2c4f46 100644
--- a/src/server/admissions/haifaProgrammePolicy.ts
+++ b/src/server/admissions/haifaProgrammePolicy.ts
@@ -1,3 +1,4 @@
+import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
 import evidence from '@/data/admissions/haifaProgrammePolicies.json';
 import { getHaifaInformationSystemsTrack } from '@/lib/haifaAdmissionsInputs';
 import type {
@@ -12,7 +13,39 @@ import type {
 export function haifaMissingRuleResult(
   programId: string,
   institution: AdmissionsEvaluationResult['institution'],
-): AdmissionsEvaluationResult {
+  context: {
+    averageIsProxy: boolean;
+    capability: AdmissionsEvaluationResult['capability'];
+    input: AdmissionsEvaluationInput;
+  },
+): AdmissionsEvaluationResult | undefined {
+  if (context.averageIsProxy) {
+    const policy = getHaifaProgrammePolicy(
+      programId,
+      context.input.extraInputs?.haifaInformationSystemsTrack,
+    );
+    if (policy?.mappingState === 'unresolved')
+      return {
+        institution,
+        linkedInstitutionId: institution.id,
+        capability: 'blocked',
+        kind: 'tracked_missing_rule',
+        decision: 'unknown',
+        confidence: 'low',
+        sourceLabel: 'מיפוי המסלול טרם אומת',
+        explanation:
+          'המיפוי של מסלול מערכות המידע החד־חוגי הרגיל למחשבון הרשמי טרם אומת. לא ניתן לקבוע זכאות עבורו.',
+        nextAction:
+          'בדקו את המסלול מול החוג. בחרו מסלול אחר רק אם זה המסלול שאליו אתם מתכוונים להירשם.',
+        officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3218/'],
+      };
+    if (
+      isBatchCUnsupportedProgramId(programId, institution.id) ||
+      context.capability === 'blocked' ||
+      context.capability === 'unsupported'
+    )
+      return undefined;
+  }
   const kind = ['psychology', 'haifa_psychology'].includes(programId)
     ? 'authority_unavailable'
     : 'tracked_missing_rule';
```

## Evaluator hunk headers against origin/main

```diff
@@ -82 +82,5 @@ import { runHaifaAdmissionsProof } from '@/server/ingestion/adapters/haifaAdmiss
@@ -196,0 +201 @@ export async function evaluateAdmissionsForProgram(args: {
@@ -329,0 +335 @@ async function evaluateCapabilityEntries(args: {
@@ -345,0 +352,15 @@ async function evaluateCapabilityEntries(args: {
@@ -1373 +1394 @@ async function evaluateExactScores(args: {
@@ -1403 +1424 @@ async function evaluateExactScores(args: {
@@ -1436 +1457 @@ async function evaluateExactScores(args: {
@@ -1456 +1477 @@ async function evaluateExactScores(args: {
@@ -1485 +1506 @@ async function evaluateExactScores(args: {
@@ -1518 +1539 @@ async function evaluateExactScores(args: {
@@ -1549 +1570,4 @@ async function evaluateExactScores(args: {
@@ -1575 +1599,4 @@ async function evaluateExactScores(args: {
@@ -1601 +1628,4 @@ async function evaluateExactScores(args: {
@@ -1628 +1658,4 @@ async function evaluateExactScores(args: {
@@ -1658 +1691,4 @@ async function evaluateExactScores(args: {
@@ -1725 +1761 @@ async function evaluateExactScores(args: {
@@ -1764 +1800 @@ async function evaluateExactScores(args: {
@@ -1797 +1833,4 @@ async function evaluateExactScores(args: {
@@ -1833 +1872 @@ async function evaluateExactScores(args: {
@@ -1863 +1902 @@ async function evaluateExactScores(args: {
@@ -1948,0 +1988,6 @@ function normalizeExactProofResult(args: {
@@ -1980,3 +2025,5 @@ function normalizeExactProofResult(args: {
@@ -1986,3 +2033,5 @@ function normalizeExactProofResult(args: {
@@ -1990 +2039 @@ function normalizeExactProofResult(args: {
```
