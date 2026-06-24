// האקדמיה למוסיקה ולמחול בירושלים
// מזהה פריט בלוח Monday: 12220685576

function getAdmissionsData() {
  return {
    institutionName: `האקדמיה למוסיקה ולמחול בירושלים`,
    institutionType: `מכללה ציבורית`,
    location: `ירושלים`,
    programName: `האקדמיה למוסיקה ולמחול בירושלים`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.jamd.ac.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה או תעודת מכינה קדם-אקדמית מוכרת.
- מעבר בחינות כניסה קפדניות: בחינה מעשית (ביצוע בכלי או שירה ברמה גבוהה לפי רפרטואר נדרש), בחינה תיאורטית בכתב (תורת המוסיקה, הרמוניה, שמיעה, סולפז'), וראיון אישי מול ועדה בוחנת.`,
      calculatorUrl: `https://www.jamd.ac.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה או תעודת מכינה קדם-אקדמית מוכרת.
- מעבר בחינות כניסה קפדניות: בחינה מעשית (ביצוע בכלי או שירה ברמה גבוהה לפי רפרטואר נדרש), בחינה תיאורטית בכתב (תורת המוסיקה, הרמוניה, שמיעה, סולפז'), וראיון אישי מול ועדה בוחנת.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- קורסי קיץ ומסלולי מכינה תיאורטית באקדמיה שנועדו להקנות את הידע המוסיקלי התיאורטי הנדרש (פיתוח שמיעה, הרמוניה, תיאוריה) לקראת בחינות הכניסה.`,
      transitionTrack: `- קבלה על סמך תעודת סיום מכינה ייעודית, מכינת 30+ או אפיק מעבר מהאוניברסיטה הפתוחה במקום בגרות.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה על סמך תעודת סיום מכינה ייעודית, מכינת 30+ או אפיק מעבר מהאוניברסיטה הפתוחה במקום בגרות.`,
      otherPaths: `- קבלה על סמך תעודת סיום מכינה ייעודית, מכינת 30+ או אפיק מעבר מהאוניברסיטה הפתוחה במקום בגרות.`
    },
    alternatives: {
      similarProgramsSameInstitution: [
        "מסלולי עיצוב, תקשורת חזותית, או אמנות פלסטית"
      ],
      sameProgramOtherInstitutions: [
        "בצלאל, שנקר, ויצו חיפה, או המדרשה לאמנות בבית ברל"
      ],
      lowerThresholdInstitutions: [
        "לימודי תעודה מקצועיים או קורסים חופשיים"
      ]
    },
    dataReliability: {
      officialSource: `https://www.jamd.ac.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות הצטיינות וסיוע; חיילים משוחררים — אפשרות מימון מהפיקדון (מוסד אקדמי מוכר); קרנות למוזיקה/מחול. (פרטים — אתר האקדמיה.)`
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
