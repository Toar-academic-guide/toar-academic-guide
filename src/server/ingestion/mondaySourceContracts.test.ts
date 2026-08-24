import { describe, expect, it } from 'vitest';

import {
  mapMondayAdmissionsSourceContract,
  parseMondayAdmissionsSourceContract,
} from './mondaySourceContracts';
import type { MondayAdmissionsContractInput } from './types';

describe('monday admissions source contracts', () => {
  it('parses the TAU reverse-engineering report into a decision-capable source contract', () => {
    const result = parseMondayAdmissionsSourceContract(tauReportInput());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.contract).toMatchObject({
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      sourceCandidateUrl: 'https://go.tau.ac.il/graphql',
      officialUrl: 'https://go.tau.ac.il/graphql',
      requestMethod: 'POST',
      capability: 'decision_capable',
      reproducedFields: ['selectedScore', 'acceptanceThreshold', 'rejectionThreshold'],
      limitations: ['Representative program only; faculty score-field mapping needs expansion'],
    });
    expect(result.contract.fieldEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractField: 'selectedScore',
          sourceField: 'hatama_handasa',
        }),
        expect.objectContaining({
          contractField: 'acceptanceThreshold',
          sourceField: 'field_this_year_receipt_threshol',
        }),
        expect.objectContaining({
          contractField: 'rejectionThreshold',
          sourceField: 'field_this_year_rejection_thresh',
        }),
      ]),
    );
  });

  it('parses the Haifa reverse-engineering report into a decision-capable source contract', () => {
    const result = parseMondayAdmissionsSourceContract(haifaReportInput());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.contract).toMatchObject({
      institutionId: 'haifa',
      institutionName: 'University of Haifa',
      sourceCandidateUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
      officialUrl: 'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet',
      requestMethod: 'GET',
      capability: 'decision_capable',
      reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
      limitations: ['Representative program only; broad Haifa program coverage is deferred'],
    });
    expect(result.contract.fieldEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractField: 'weightedScore',
          sampleValue: 649,
        }),
        expect.objectContaining({
          contractField: 'acceptanceCutoff',
          sampleValue: 500,
        }),
        expect.objectContaining({
          contractField: 'rejectionCutoff',
          sampleValue: 469,
        }),
      ]),
    );
  });

  it('fails closed for malformed reports instead of guessing fields', () => {
    const result = parseMondayAdmissionsSourceContract({
      ...tauReportInput(),
      body: tauReportInput().body.replace('**Method**: `POST`', '**Method**: ``'),
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'missing_method',
        message: 'TAU report is missing the HTTP method.',
      },
    });
  });

  it('rejects unsupported report formats outside the TAU and Haifa v1 scope', () => {
    const result = parseMondayAdmissionsSourceContract({
      body: '### Reverse Engineering Attempt: אוניברסיטת בר-אילן<br>**Status**: Blocked by Anti-Bot Protection (Radware Captcha / hCaptcha)<br>**Details**:<br>The automated Playwright browser was blocked.',
      provenance: {
        source: 'monday_update_export',
        itemId: '12220699711',
        itemName: 'Bar-Ilan University',
        updateId: '5314600000',
        sourceCandidateUrl: 'https://shoham.biu.ac.il/kabala/Psychometric.aspx',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unsupported_report',
        message: 'Only the reviewed admissions reverse-engineering report formats are supported.',
      },
    });
  });

  it.each([
    {
      input: reichmanReportInput(),
      targetId: 'reichman-client-formula',
      institutionId: 'reichman',
      reproducedFields: ['adaptedScore'],
    },
    {
      input: afekaReportInput(),
      targetId: 'afeka-client-formula',
      institutionId: 'afeka',
      reproducedFields: ['sekhemScore', 'subjectGates'],
    },
    {
      input: hitReportInput(),
      targetId: 'hit-client-formula',
      institutionId: 'hit',
      reproducedFields: ['bagrutAverage', 'departmentGates'],
    },
    {
      input: shenkarReportInput(),
      targetId: 'shenkar-bagrut-helper',
      institutionId: 'shenkar',
      reproducedFields: ['bagrutAverage'],
    },
    {
      input: mtaReportInput(),
      targetId: 'mta-requirements-only',
      institutionId: 'mta',
      reproducedFields: [],
    },
  ])(
    'maps reviewed non-exact $institutionId Monday evidence to its source target',
    ({ input, targetId, institutionId, reproducedFields }) => {
      const parsed = parseMondayAdmissionsSourceContract(input);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) {
        return;
      }

      expect(parsed.contract).toMatchObject({
        institutionId,
        capability: 'score_only',
        requestMethod: 'GET',
        reproducedFields,
      });

      const mapped = mapMondayAdmissionsSourceContract(parsed.contract);
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) {
        return;
      }

      expect(mapped.mapping.target.id).toBe(targetId);
      expect(mapped.mapping.sourceDescriptor).toMatchObject({
        id: targetId,
        institutionId,
        difficulty: 'hard_manual',
      });
      expect(mapped.mapping.reviewableEvidence).toMatchObject({
        publicationBoundary: 'reviewable_evidence_only',
        targetId,
        reproducedFields,
      });
    },
  );

  it('maps the TAU contract to the existing exact source target and reviewable evidence', () => {
    const parsed = parseMondayAdmissionsSourceContract(tauReportInput());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const mapped = mapMondayAdmissionsSourceContract(parsed.contract);

    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.mapping.target.id).toBe('tau-digital-sciences-live');
    expect(mapped.mapping.sourceDescriptor).toMatchObject({
      id: 'tau-digital-sciences-live',
      institutionId: 'tau',
      programId: 'tau-digital-sciences',
      difficulty: 'easy',
      sourceUrl: 'https://go.tau.ac.il/graphql',
    });
    expect(mapped.mapping.reviewableEvidence).toMatchObject({
      publicationBoundary: 'reviewable_evidence_only',
      targetId: 'tau-digital-sciences-live',
      reproducedFields: ['selectedScore', 'acceptanceThreshold', 'rejectionThreshold'],
    });
  });

  it('maps the Haifa contract to the existing exact source target and reviewable evidence', () => {
    const parsed = parseMondayAdmissionsSourceContract(haifaReportInput());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const mapped = mapMondayAdmissionsSourceContract(parsed.contract);

    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.mapping.target.id).toBe('haifa-cs-live');
    expect(mapped.mapping.sourceDescriptor).toMatchObject({
      id: 'haifa-cs-live',
      institutionId: 'haifa',
      programId: 'haifa-cs',
      difficulty: 'easy',
      sourceUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    });
    expect(mapped.mapping.reviewableEvidence).toMatchObject({
      publicationBoundary: 'reviewable_evidence_only',
      targetId: 'haifa-cs-live',
      reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
    });
  });

  it('keeps monday contract conversion outside canonical admissions publication tables', () => {
    const parsed = parseMondayAdmissionsSourceContract(haifaReportInput());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const mapped = mapMondayAdmissionsSourceContract(parsed.contract);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.mapping.publicationBoundary).toBe('reviewable_evidence_only');
    expect(mapped.mapping.canonicalPublicationTables).toEqual([]);
    expect(mapped.mapping.reviewableEvidence).toMatchObject({
      evidenceKind: 'monday_reverse_engineering_report',
      publicationBoundary: 'reviewable_evidence_only',
    });
  });
});

function tauReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary for Tel Aviv University Calculator<br><br>**Primary API Endpoint**: `https://go.tau.ac.il/graphql`<br>**Method**: `POST`<br><br>#### 1. Calculator Request Schema<br>- **GraphQL Operation**: `getLastScore`<br>- **Input Variables**:<br>  - `bagrut`: Maturity average (string, e.g. `"105.5"`)<br>  - `psicho`: Psychometric score (string, e.g. `"680"`)<br>  - `prog`: `"calctziun"` (static)<br>  - `out`: `"json"` (static)<br>  - `reali10`: `0` (static math track coefficient)<br>- **Minimum Headers**: `content-type: application/json` (No cookies or auth required!)<br><br>#### 2. Sample Request<br>```bash<br>curl -X POST https://go.tau.ac.il/graphql \\<br>  -H "content-type: application/json" \\<br>  -d \'{"operationName":"getLastScore","variables":{"scoresData":{"prog":"calctziun","out":"json","reali10":0,"psicho":"680","bagrut":"105.5"}},"query":"query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }"}\'<br>```<br><br>#### 3. Response Structure &amp; Calculation Logic<br>- The response returns multiple faculty-specific Sekhem scores:<br>  - `hatama` (General)<br>  - `hatama_nihul` (Management)<br>  - `hatama_refua` (Medicine)<br>  - `hatama_handasa` (Engineering)<br>  - `hatama_meduyakim` (Exact Sciences)<br>- Cutoffs are retrieved via the program lookup query `getPrograms` (field `field_this_year_receipt_threshol` and `field_this_year_rejection_thresh`).<br>- Comparison score is selected dynamically by checking the program\'s faculty code `field_faculty_mamta_1` (e.g. `0500` for Engineering compares against `hatama_handasa`).',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699631',
      itemName: '2. אוניברסיטת תל אביב',
      updateId: '5314395195',
      createdAt: '2026-06-23T20:58:37.000Z',
      sourceCandidateUrl: 'https://go.tau.ac.il/graphql',
    },
  };
}

function haifaReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary: University of Haifa<br>**Calculator Page**: https://applicants.haifa.ac.il/enrollmentChances/index.html<br>**Primary API Endpoint**: `https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet`<br>**Method**: `GET`<br><br>#### 1. Request Details<br>* **Payload Type**: query parameters<br>* **Headers**:<br>  * `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36`<br>  * `Accept: application/json, text/javascript, */*; q=0.01`<br>  * `X-Requested-With: XMLHttpRequest`<br>  * `Referer: https://applicants.haifa.ac.il/enrollmentChances/index.html`<br>* **Cookies/Anti-Bot Required**: No active bot manager block detected. However, calls to the API must follow the correct session initialization sequence, otherwise SAP NetWeaver AS returns a `500 Internal Server Error`.<br><br>#### 2. API Workflow Sequence<br>To successfully simulate calculations programmatically, you must execute the requests in the following sequence:<br><br>##### Step 1: Initialize Connection Session<br>Initialize the tracking session on the backend:<br>`GET https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=checkConnection`<br>* **Response**: Returns a JSON containing a `guid` token:<br>  ```json<br>  {<br>    "data": { "guid": "b06f94f3-7b51-3f10-9799-b54ce02b98f1" },<br>    "return": { "type": "S", "message": "" }<br>  }<br>  ```<br><br>##### Step 3: Calculate Admission Chances<br>Send the score payload:<br>`GET https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=calculateChances&year=&semester=&hug=&program=&bag_year=&bag_type=&bag_avg=&psy_year=&psy_math=&psy_english=&psy_verbal=`<br><br>#### 5. Expected Response Structure<br>Returns a JSON object containing the weighted score and thresholds:<br>```json<br>{<br>  "data": [<br>    {<br>      "results": [<br>        {<br>          "content": [<br>            { "label": "הציון המשוקלל שלך", "type": "num", "value": "649" },<br>            { "label": "חתך קבלה", "type": "num", "value": "500" },<br>            { "label": "חתך דחייה", "type": "num", "value": "469" },<br>            { "label": "ציון הפסיכומטרי שלך", "type": "num", "value": "614" }<br>          ]<br>        }<br>      ]<br>    }<br>  ]<br>}<br>```<br>',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699681',
      itemName: '6. אוניברסיטת חיפה',
      updateId: '5314596642',
      createdAt: '2026-06-23T21:54:09.000Z',
      sourceCandidateUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    },
  };
}

function reichmanReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary: Reichman University<br>Calculator: https://www.runi.ac.il/admissions/undergraduate/calculator<br>Reviewed client-side formula: Adapted = 4.812 * bagrut + 0.5131 * psychometric - 163.19.',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699751',
      itemName: 'Reichman University',
      updateId: '5314700001',
      sourceCandidateUrl: 'https://www.runi.ac.il/admissions/undergraduate/calculator',
    },
  };
}

function afekaReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary: Afeka<br>Calculator: https://www.afeka.ac.il/candidate/candidate-information-bsc/calculator/<br>Subject-weighted formula with subject gates. Math Minimum and פסיכומטרי לפחות 550 are required.',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699752',
      itemName: 'Afeka College of Engineering',
      updateId: '5314700002',
      sourceCandidateUrl: 'https://www.afeka.ac.il/candidate/candidate-information-bsc/calculator/',
    },
  };
}

function hitReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary: HIT<br>Calculator: https://calc.hit.ac.il/<br>Department gates and minimum floors were reviewed. Math Deficit is shown for technical departments.',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699753',
      itemName: 'HIT',
      updateId: '5314700003',
      sourceCandidateUrl: 'https://calc.hit.ac.il/',
    },
  };
}

function shenkarReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Reverse Engineering Summary: Shenkar<br>Calculator: https://www.shenkar.ac.il/he/pages/calc/<br>Bagrut Average helper only; no combined psychometric formula exists for admissions decisions.',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699754',
      itemName: 'Shenkar',
      updateId: '5314700004',
      sourceCandidateUrl: 'https://www.shenkar.ac.il/he/pages/calc/',
    },
  };
}

function mtaReportInput(): MondayAdmissionsContractInput {
  return {
    body: '### Requirements Review: Academic College of Tel Aviv-Yaffo<br>Source: https://www.mta.ac.il/conditions_for_applying<br>No calculator formula was parsed; use requirements-only enrichment.',
    provenance: {
      source: 'monday_update_export',
      itemId: '12220699755',
      itemName: 'MTA',
      updateId: '5314700005',
      sourceCandidateUrl: 'https://www.mta.ac.il/conditions_for_applying',
    },
  };
}
