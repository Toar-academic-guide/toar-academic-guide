// המכללה למנהל
// מזהה פריט בלוח Monday: 12230979966

function getAdmissionsData() {
  return {
    institutionName: `המכללה למנהל`,
    institutionType: `מכללה פרטית`,
    location: `ראשון לציון`,
    programName: `המכללה למנהל`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.colman.ac.il/academics/ba/business-administration/`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה (או מכינה קדם אקדמית).
- ציון פסיכומטרי או עמידה במבחני התאמה פנימיים.
- דרישת סף וסיווג רמת אנגלית במבחן פסיכומטרי/אמירנט.
- ממוצע בגרות נדרש משתנה לפי חוג (למשל מנע"ס דורש ממוצע 80+ לקבלה ללא פסיכומטרי).`,
      calculatorUrl: `https://www.colman.ac.il/academics/ba/business-administration/`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה (או מכינה קדם אקדמית).
- ציון פסיכומטרי או עמידה במבחני התאמה פנימיים.
- דרישת סף וסיווג רמת אנגלית במבחן פסיכומטרי/אמירנט.
- ממוצע בגרות נדרש משתנה לפי חוג (למשל מנע"ס דורש ממוצע 80+ לקבלה ללא פסיכומטרי).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה ייעודית קדם-אקדמית המיועדת להשלמת בגרויות או שיפור ממוצע הבגרות לצורך עמידה בתנאי הקבלה האקדמיים.`,
      transitionTrack: `- קבלה ללא פסיכומטרי לבעלי ממוצע בגרות גבוה במיוחד בהתאם למסלול הנבחר.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה ללא פסיכומטרי לבעלי ממוצע בגרות גבוה במיוחד בהתאם למסלול הנבחר.`,
      otherPaths: `- קבלה ללא פסיכומטרי לבעלי ממוצע בגרות גבוה במיוחד בהתאם למסלול הנבחר.`
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
      officialSource: `https://www.colman.ac.il/academics/ba/business-administration/`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע כלכלי, הצטיינות ומנהיגות; חיילים משוחררים — מימון מהפיקדון. (פרטים — אתר המכללה למנהל.)`
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
