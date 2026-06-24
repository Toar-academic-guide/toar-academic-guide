// המדרשה לאמנות (בית ברל)
// מזהה פריט בלוח Monday: 12220696298

function getAdmissionsData() {
  return {
    institutionName: `המדרשה לאמנות (בית ברל)`,
    institutionType: `מכללה ציבורית`,
    location: `כפר סבא`,
    programName: `המדרשה לאמנות (בית ברל)`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.hamidrasha.org.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה בממוצע של 85 ומעלה.
- ציון התאמה משוקלל (בגרות ופסיכומטרי) של 525 לפחות.
- מעבר תהליך מיון אמנותי: הגשת תיק עבודות מקיף, ביצוע מטלת בית או כתיבת טקסט קצר, וראיון קבלה אישי מול ועדה.`,
      calculatorUrl: `https://www.hamidrasha.org.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה בממוצע של 85 ומעלה.
- ציון התאמה משוקלל (בגרות ופסיכומטרי) של 525 לפחות.
- מעבר תהליך מיון אמנותי: הגשת תיק עבודות מקיף, ביצוע מטלת בית או כתיבת טקסט קצר, וראיון קבלה אישי מול ועדה.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם-אקדמית לשיפור ציוני בגרות או הכנה למבחן פסיכומטרי כדי לעמוד בתנאי הסף האקדמיים.`,
      transitionTrack: `- קבלה ללא פסיכומטרי למועמדים בעלי יכולות אמנותיות יוצאות דופן וממוצע בגרות גבוה במיוחד (למשל, 92 ומעלה), בכפוף לראיון וועדת קבלה.
- תנאי קבלה מותאמים למועמדים בני 30 ומעלה.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה ללא פסיכומטרי למועמדים בעלי יכולות אמנותיות יוצאות דופן וממוצע בגרות גבוה במיוחד (למשל, 92 ומעלה), בכפוף לראיון וועדת קבלה.
- תנאי קבלה מותאמים למועמדים בני 30 ומעלה.`,
      otherPaths: `- קבלה ללא פסיכומטרי למועמדים בעלי יכולות אמנותיות יוצאות דופן וממוצע בגרות גבוה במיוחד (למשל, 92 ומעלה), בכפוף לראיון וועדת קבלה.
- תנאי קבלה מותאמים למועמדים בני 30 ומעלה.`
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
      officialSource: `https://www.hamidrasha.org.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות של בית ברל; חיילים משוחררים — אפשרות מימון מהפיקדון (מוסד אקדמי מוכר). (פרטים — אתר בית ברל.)`
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
