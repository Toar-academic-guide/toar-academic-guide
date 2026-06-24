// בצלאל אקדמיה לאמנות ועיצוב
// מזהה פריט בלוח Monday: 12220680984

function getAdmissionsData() {
  return {
    institutionName: `בצלאל אקדמיה לאמנות ועיצוב`,
    institutionType: `מכללה ציבורית`,
    location: `ירושלים`,
    programName: `בצלאל אקדמיה לאמנות ועיצוב`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.bezalel.ac.il`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה או תעודה שוות ערך.
- מעבר תהליך מיון פנימי קפדני (המהווה את המרכיב העיקרי לקבלה).
- הגשת תיק עבודות המציג יכולות אמנותיות, יצירתיות וחשיבה אישית (למעט חוגים ספציפיים).
- ביצוע תרגילי בית ומבחני מיון מעשיים (רישום, עיצוב, חשיבה מרחבית).
- מעבר ראיון קבלה אישי בפני ועדה בוחנת.`,
      calculatorUrl: `https://www.bezalel.ac.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה או תעודה שוות ערך.
- מעבר תהליך מיון פנימי קפדני (המהווה את המרכיב העיקרי לקבלה).
- הגשת תיק עבודות המציג יכולות אמנותיות, יצירתיות וחשיבה אישית (למעט חוגים ספציפיים).
- ביצוע תרגילי בית ומבחני מיון מעשיים (רישום, עיצוב, חשיבה מרחבית).
- מעבר ראיון קבלה אישי בפני ועדה בוחנת.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה ללימודי עיצוב ואדריכלות במסגרת היחידה ללימודי חוץ של בצלאל.
- המכינה נועדה לסייע למועמדים בבניית תיק עבודות מתאים, פיתוח שפה יצירתית, והכנה למבחנים ולראיונות.
- המכינה אינה מהווה תנאי קבלה רשמי ואינה מחליפה את דרישות הבגרות.`,
      transitionTrack: `- קבלה על בסיס כישרון אמנותי בולט ומעבר מוצלח של שלבי המיון המקצועיים, ללא התחשבות בציונים אקדמיים קלאסיים (אין דרישה לציון פסיכומטרי ברוב המחלקות, למעט אדריכלות נוף המשותפת עם האוניברסיטה העברית).`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה על בסיס כישרון אמנותי בולט ומעבר מוצלח של שלבי המיון המקצועיים, ללא התחשבות בציונים אקדמיים קלאסיים (אין דרישה לציון פסיכומטרי ברוב המחלקות, למעט אדריכלות נוף המשותפת עם האוניברסיטה העברית).`,
      otherPaths: `- קבלה על בסיס כישרון אמנותי בולט ומעבר מוצלח של שלבי המיון המקצועיים, ללא התחשבות בציונים אקדמיים קלאסיים (אין דרישה לציון פסיכומטרי ברוב המחלקות, למעט אדריכלות נוף המשותפת עם האוניברסיטה העברית).`
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
      officialSource: `https://www.bezalel.ac.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע על בסיס כלכלי ומלגות הצטיינות; חיילים משוחררים — אפשרות מימון מהפיקדון (מוסד אקדמי מוכר); קרנות חיצוניות לסטודנטים לאמנות/עיצוב. (פרטים — אתר בצלאל.)`
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
