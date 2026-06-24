// המכללה האקדמית הדסה ירושלים
// מזהה פריט בלוח Monday: 12220685569

function getAdmissionsData() {
  return {
    institutionName: `המכללה האקדמית הדסה ירושלים`,
    institutionType: `מכללה ציבורית`,
    location: `ירושלים`,
    programName: `המכללה האקדמית הדסה ירושלים`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.hac.ac.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה או תעודת מכינה.
- סיווג רמת אנגלית (במסגרת הפסיכומטרי או מבחן אמי"ר/אמיר"ם).
- מעבר ראיון קבלה אישי בחלק גדול מהחוגים.
- דרישות ממוצע בגרות משתנות בין החוגים (נע בין 80 ל-100+ בהתאם למסלול).`,
      calculatorUrl: `https://www.hac.ac.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה או תעודת מכינה.
- סיווג רמת אנגלית (במסגרת הפסיכומטרי או מבחן אמי"ר/אמיר"ם).
- מעבר ראיון קבלה אישי בחלק גדול מהחוגים.
- דרישות ממוצע בגרות משתנות בין החוגים (נע בין 80 ל-100+ בהתאם למסלול).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינות קדם-אקדמיות ייעודיות (מדעים, מדעי החברה, עיצוב וצילום ועוד).
- סיום המכינה בהצלחה מאפשר קבלה לחוגים השונים במכללה כחלופה לתעודת הבגרות.`,
      transitionTrack: `- קבלה על סמך ממוצע בגרות/מכינה בלבד (ללא פסיכומטרי).
- קבלה על בסיס ציון מתאם המשלב ממוצע בגרות יחד עם פסיכומטרי או מבחן תיל פנימי (לרוב בטווח 470–560 ומעלה).
- קבלה חריגה (ועדת חריגים) של עד 10% מועמדים שאינם עומדים ברפי הקבלה הרשמיים.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה על סמך ממוצע בגרות/מכינה בלבד (ללא פסיכומטרי).
- קבלה על בסיס ציון מתאם המשלב ממוצע בגרות יחד עם פסיכומטרי או מבחן תיל פנימי (לרוב בטווח 470–560 ומעלה).
- קבלה חריגה (ועדת חריגים) של עד 10% מועמדים שאינם עומדים ברפי הקבלה הרשמיים.`,
      otherPaths: `- קבלה על סמך ממוצע בגרות/מכינה בלבד (ללא פסיכומטרי).
- קבלה על בסיס ציון מתאם המשלב ממוצע בגרות יחד עם פסיכומטרי או מבחן תיל פנימי (לרוב בטווח 470–560 ומעלה).
- קבלה חריגה (ועדת חריגים) של עד 10% מועמדים שאינם עומדים ברפי הקבלה הרשמיים.`
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
      officialSource: `https://www.hac.ac.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות; חיילים משוחררים — מימון מהפיקדון; ראויים לקידום. (פרטים — אתר המרכז האקדמי הרב-תחומי ירושלים/הדסה.)`
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
