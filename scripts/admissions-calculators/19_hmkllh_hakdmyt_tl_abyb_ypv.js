// המכללה האקדמית תל אביב-יפו
// מזהה פריט בלוח Monday: 12220708944

function getAdmissionsData() {
  return {
    institutionName: `המכללה האקדמית תל אביב-יפו`,
    institutionType: `מכללה ציבורית`,
    location: `תל אביב`,
    programName: `המכללה האקדמית תל אביב-יפו`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.mta.ac.il/conditions_for_applying`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה (או מכינה שנתית מוכרת מל"ג).
- בחינה פסיכומטרית.
- סיווג רמת אנגלית (בפסיכומטרי או במבחן אמירנט).
- מבחן יע"ל למועמדים ששפת ההוראה בבית ספרם אינה עברית.
- הקבלה מתבססת על ציון משולב/מתואם (בגרות ופסיכומטרי) בהתאם לחתכי הקבלה של החוגים השונים.`,
      calculatorUrl: `https://www.mta.ac.il/conditions_for_applying`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה (או מכינה שנתית מוכרת מל"ג).
- בחינה פסיכומטרית.
- סיווג רמת אנגלית (בפסיכומטרי או במבחן אמירנט).
- מבחן יע"ל למועמדים ששפת ההוראה בבית ספרם אינה עברית.
- הקבלה מתבססת על ציון משולב/מתואם (בגרות ופסיכומטרי) בהתאם לחתכי הקבלה של החוגים השונים.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם אקדמית שנתית המוכרת על ידי המועצה להשכלה גבוהה (מל"ג) כחלופה או שיפור לנתוני הבגרות.`,
      transitionTrack: `- קבלה חריגה דרך ועדת קבלה (עד 10% מהמתקבלים) על בסיס שיקולי נגישות, רקע ייחודי או מילואים במלחמת חרבות ברזל (מכסה מוגדרת של 8% למשרתי מילואים).`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה חריגה דרך ועדת קבלה (עד 10% מהמתקבלים) על בסיס שיקולי נגישות, רקע ייחודי או מילואים במלחמת חרבות ברזל (מכסה מוגדרת של 8% למשרתי מילואים).`,
      otherPaths: `- קבלה חריגה דרך ועדת קבלה (עד 10% מהמתקבלים) על בסיס שיקולי נגישות, רקע ייחודי או מילואים במלחמת חרבות ברזל (מכסה מוגדרת של 8% למשרתי מילואים).`
    },
    alternatives: {
      similarProgramsSameInstitution: [
        "מסלולי בוגר משיקים בתחומי הלימוד של המוסד"
      ],
      sameProgramOtherInstitutions: [
        "מוסדות אקדמיים מקבילים המציעים מסלול דומה"
      ],
      lowerThresholdInstitutions: [
        "האוניברסיטה הפתוחה (קבלה פתוחה) או לימודי תעודה/הנדסאים"
      ]
    },
    dataReliability: {
      officialSource: `https://www.mta.ac.il/conditions_for_applying`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע סוציו-אקונומי והצטיינות; חיילים משוחררים — מימון מהפיקדון; ראויים לקידום. (פרטים — אתר המכללה.)`
    }
  };
}

async function main() {
  const data = getAdmissionsData();
  console.log(`=== ${data.institutionName} ===`);
  console.log(`\n[1. פרטי מוסד ומסלול]`);
  console.log(`- סוג מוסד: ${data.institutionType}`);
  console.log(`- מיקום/קמפוס: ${data.location}`);
  console.log(`- סוג תואר: ${data.degreeType}`);
  console.log(`- קישור רשמי: ${data.officialUrl}`);

  console.log(`\n[2. תנאי קבלה]`);
  console.log(`${data.admissionRequirements.sekhemThreshold}`);
  if (data.admissionRequirements.calculatorUrl) {
    console.log(`- קישור למחשבון סכם: ${data.admissionRequirements.calculatorUrl}`);
  }

  console.log(`\n[3. אם המשתמש לא עומד בתנאים (נתיבים חלופיים)]`);
  if (data.alternativePaths.preparatoryProgram) {
    console.log(`- מכינה רלוונטית: \n${data.alternativePaths.preparatoryProgram}`);
  }
  if (data.alternativePaths.transitionTrack) {
    console.log(`- אפיקי מעבר וקבלה חלופית: \n${data.alternativePaths.transitionTrack}`);
  }

  console.log(`\n[4. חלופות]`);
  console.log(`- מסלולים דומים באותו מוסד: ${data.alternatives.similarProgramsSameInstitution.join(', ')}`);
  console.log(`- מוסדות אחרים עם מסלול דומה: ${data.alternatives.sameProgramOtherInstitutions.join(', ')}`);
  console.log(`- מוסדות עם תנאי קבלה נמוכים יותר: ${data.alternatives.lowerThresholdInstitutions.join(', ')}`);

  console.log(`\n[5. אמינות הדאטה]`);
  console.log(`- מקור רשמי: ${data.dataReliability.officialSource}`);
  console.log(`- תאריך בדיקה: ${data.dataReliability.checkDate}`);
  console.log(`- רמת ביטחון: ${data.dataReliability.confidenceLevel}`);
  if (data.dataReliability.barriersAndNotes) {
    console.log(`- הערות וחסמים: ${data.dataReliability.barriersAndNotes}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getAdmissionsData, main };
