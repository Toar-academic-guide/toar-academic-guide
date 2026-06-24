// סם שפיגל לקולנוע ולטלוויזיה
// מזהה פריט בלוח Monday: 12220697936

function getAdmissionsData() {
  return {
    institutionName: `סם שפיגל לקולנוע ולטלוויזיה`,
    institutionType: `מכללה פרטית`,
    location: `ירושלים`,
    programName: `סם שפיגל לקולנוע ולטלוויזיה`,
    degreeType: `תעודה מקצועית`,
    officialUrl: `https://www.jsfs.co.il`,
    admissionRequirements: {
      sekhemThreshold: `בית ספר מקצועי לקולנוע וטלוויזיה (לא אקדמי), תחרותי. קבלה רב-שלבית: מבחני בית → מבחני מיון → ראיון אישי מול ועדת קבלה. מבוסס כישרון ולא ציונים. מסלול תסריטאות דורש זכאות לבגרות וגיל עד 40.`,
      calculatorUrl: `https://www.jsfs.co.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `בית ספר מקצועי לקולנוע וטלוויזיה (לא אקדמי), תחרותי. קבלה רב-שלבית: מבחני בית → מבחני מיון → ראיון אישי מול ועדת קבלה. מבוסס כישרון ולא ציונים. מסלול תסריטאות דורש זכאות לבגרות וגיל עד 40.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `לא רלוונטי — ביה״ס מקצועי לקולנוע ללא מכינה אקדמית; קבלה רב-שלבית מבוססת כישרון.`,
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
      officialSource: `https://www.jsfs.co.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות וקרנות לקולנוע (מוסד מוכר ויוקרתי); חיילים משוחררים — אפשרות מימון מהפיקדון. (פרטים — אתר סם שפיגל.)`
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
