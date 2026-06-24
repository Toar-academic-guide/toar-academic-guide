// הסטודיו למשחק יורם לוינשטיין
// מזהה פריט בלוח Monday: 12220697940

function getAdmissionsData() {
  return {
    institutionName: `הסטודיו למשחק יורם לוינשטיין`,
    institutionType: `מכללה פרטית`,
    location: `תל אביב`,
    programName: `הסטודיו למשחק יורם לוינשטיין`,
    degreeType: `תעודה מקצועית`,
    officialUrl: `https://www.studio.org.il`,
    admissionRequirements: {
      sekhemThreshold: `סטודיו מקצועי למשחק (לא אקדמי). הקבלה מבוססת אודישן (מונולוגים + סדנת אימפרוביזציה) וראיון; אין דרישת בגרות. הרשמה לשנה א׳ מגיל 18.`,
      calculatorUrl: `https://www.studio.org.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `סטודיו מקצועי למשחק (לא אקדמי). הקבלה מבוססת אודישן (מונולוגים + סדנת אימפרוביזציה) וראיון; אין דרישת בגרות. הרשמה לשנה א׳ מגיל 18.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `לא רלוונטי — סטודיו מקצועי למשחק ללא מכינה אקדמית; קבלה מבוססת אודישן.`,
      transitionTrack: ``,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: ``,
      otherPaths: ``
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
      officialSource: `https://www.studio.org.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מוסד בתשלום; ייתכנו מלגות/מסלולי תשלום ומימון מהפיקדון לתכניות מוכרות — לאימות מול הסטודיו.`
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
