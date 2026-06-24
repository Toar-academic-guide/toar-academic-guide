// המרכז האקדמי ויצו חיפה
// מזהה פריט בלוח Monday: 12220687656

function getAdmissionsData() {
  return {
    institutionName: `המרכז האקדמי ויצו חיפה`,
    institutionType: `מכללה ציבורית`,
    location: `חיפה`,
    programName: `המרכז האקדמי ויצו חיפה`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.wizo.org.il`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה.
- ציון פסיכומטרי של 525 לפחות.
- עמידה ברף ציון סכם משוקלל (בגרות ופסיכומטרי).
- מעבר תהליך מיון מקצועי מעשי: הגשת תיק עבודות (דו-מימד ותלת-מימד), מבחני מיון מעשיים במכללה (רישום, עיצוב וכו'), וראיון קבלה אישי.`,
      calculatorUrl: `https://www.wizo.org.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה.
- ציון פסיכומטרי של 525 לפחות.
- עמידה ברף ציון סכם משוקלל (בגרות ופסיכומטרי).
- מעבר תהליך מיון מקצועי מעשי: הגשת תיק עבודות (דו-מימד ותלת-מימד), מבחני מיון מעשיים במכללה (רישום, עיצוב וכו'), וראיון קבלה אישי.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינות עיצוב ואדריכלות ייעודיות לחיזוק כישורים אמנותיים, הכנת תיק עבודות מתאים וסימולציות לקראת מבחני המיון המקצועיים.`,
      transitionTrack: `- קבלה במעמד מיוחד במקרים חריגים ללא בגרות או פסיכומטרי, בכפוף למעבר מבחני הקבלה המעשיים והשלמת החסרים במהלך שנת הלימודים הראשונה.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה במעמד מיוחד במקרים חריגים ללא בגרות או פסיכומטרי, בכפוף למעבר מבחני הקבלה המעשיים והשלמת החסרים במהלך שנת הלימודים הראשונה.`,
      otherPaths: `- קבלה במעמד מיוחד במקרים חריגים ללא בגרות או פסיכומטרי, בכפוף למעבר מבחני הקבלה המעשיים והשלמת החסרים במהלך שנת הלימודים הראשונה.`
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
      officialSource: `https://www.wizo.org.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות; חיילים משוחררים — אפשרות מימון מהפיקדון (מוסד אקדמי מוכר); קרנות לסטודנטים לעיצוב/אמנות. (פרטים — אתר ויצו.)`
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
