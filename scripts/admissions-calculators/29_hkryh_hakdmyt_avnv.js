// הקריה האקדמית אונו
// מזהה פריט בלוח Monday: 12220680982

function getAdmissionsData() {
  return {
    institutionName: `הקריה האקדמית אונו`,
    institutionType: `מכללה פרטית`,
    location: `קרית אונו`,
    programName: `הקריה האקדמית אונו`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.ono.ac.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה או סיום מכינה.
- ממוצע בגרות נדרש לפי חוג: 80 ומעלה למנהל עסקים וחינוך, 85 ומעלה למשפטים.
- מקצועות כגון סיעוד ופיזיותרפיה דורשים ציון סכם גבוה ומעבר מבחני התאמה/פסיכומטרי.
- סיווג רמת אנגלית (בפסיכומטרי או במבחן אמירנט).`,
      calculatorUrl: `https://www.ono.ac.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה או סיום מכינה.
- ממוצע בגרות נדרש לפי חוג: 80 ומעלה למנהל עסקים וחינוך, 85 ומעלה למשפטים.
- מקצועות כגון סיעוד ופיזיותרפיה דורשים ציון סכם גבוה ומעבר מבחני התאמה/פסיכומטרי.
- סיווג רמת אנגלית (בפסיכומטרי או במבחן אמירנט).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינות קדם-אקדמיות ייעודיות לשיפור בגרויות כחלופה לקבלה ישירה.
- מכינת 30+ לבני 30 ומעלה שאינם מחזיקים בתעודת בגרות מלאה.`,
      transitionTrack: `- אפיקי קבלה עוקפי פסיכומטרי לרוב החוגים על סמך ממוצע בגרות.
- דיון בוועדות קבלה וחריגים לבעלי רקע מקצועי מתאים או בני 30+.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- אפיקי קבלה עוקפי פסיכומטרי לרוב החוגים על סמך ממוצע בגרות.
- דיון בוועדות קבלה וחריגים לבעלי רקע מקצועי מתאים או בני 30+.`,
      otherPaths: `- אפיקי קבלה עוקפי פסיכומטרי לרוב החוגים על סמך ממוצע בגרות.
- דיון בוועדות קבלה וחריגים לבעלי רקע מקצועי מתאים או בני 30+.`
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
      officialSource: `https://www.ono.ac.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע כלכלי והצטיינות; חיילים משוחררים — מימון מהפיקדון; מסלולים ותמיכה לאוכלוסיות שהאקדמיה פחות נגישה להן (קמפוס חרדי, מגזר ערבי). (פרטים — אתר אונו.)`
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
