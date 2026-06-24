// בית הספר למוסיקה בוכמן-מהטה
// מזהה פריט בלוח Monday: 12220685577

function getAdmissionsData() {
  return {
    institutionName: `בית הספר למוסיקה בוכמן-מהטה`,
    institutionType: `אוניברסיטה ציבורית`,
    location: `תל אביב`,
    programName: `בית הספר למוסיקה בוכמן-מהטה`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://arts.tau.ac.il/Music`,
    admissionRequirements: {
      sekhemThreshold: `- עמידה בתנאי הקבלה האקדמיים הכלליים של אוניברסיטת תל אביב לתואר ראשון (תעודת בגרות מלאה וציון פסיכומטרי).
- מעבר בחינות כניסה פנימיות במוזיקה במקצוע הראשי (נגינה, זמרה או ראיון אישי בהתאם למסלול).
- מעבר בחינות כניסה במקצועות התיאורטיים (תיאוריה, פיתוח שמיעה ומיומנות מקלדת).`,
      calculatorUrl: `https://arts.tau.ac.il/Music`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- עמידה בתנאי הקבלה האקדמיים הכלליים של אוניברסיטת תל אביב לתואר ראשון (תעודת בגרות מלאה וציון פסיכומטרי).
- מעבר בחינות כניסה פנימיות במוזיקה במקצוע הראשי (נגינה, זמרה או ראיון אישי בהתאם למסלול).
- מעבר בחינות כניסה במקצועות התיאורטיים (תיאוריה, פיתוח שמיעה ומיומנות מקלדת).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינת קיץ פנימית: מיועדת להשלמת ידע מקצועי בתיאוריה ופיתוח שמיעה (בחודשים אוגוסט-ספטמבר).
- מיועדת למועמדים שהפגינו כישורים מוזיקליים מעולים בבחינות המעשיות אך נמצאו פערים בידע התיאורטי שלהם.
- מעבר המכינה בהצלחה (נוכחות ומבחן סיום) הינו תנאי הכרחי להתחלת הלימודים.
- המכינה אינה מחליפה את תנאי הסף האקדמיים הכלליים של האוניברסיטה (בגרות ופסיכומטרי).`,
      transitionTrack: `- מסלול "מוזיקאי מצטיין": מיועד למוזיקאים צעירים מצטיינים לפני או במהלך שירות צבאי. הקבלה מבוססת על הכישרון המוזיקלי והישגים בולטים, בכפוף להשלמת הדרישות האקדמיות הכלליות של האוניברסיטה בהמשך הלימודים.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- מסלול "מוזיקאי מצטיין": מיועד למוזיקאים צעירים מצטיינים לפני או במהלך שירות צבאי. הקבלה מבוססת על הכישרון המוזיקלי והישגים בולטים, בכפוף להשלמת הדרישות האקדמיות הכלליות של האוניברסיטה בהמשך הלימודים.`,
      otherPaths: `- מסלול "מוזיקאי מצטיין": מיועד למוזיקאים צעירים מצטיינים לפני או במהלך שירות צבאי. הקבלה מבוססת על הכישרון המוזיקלי והישגים בולטים, בכפוף להשלמת הדרישות האקדמיות הכלליות של האוניברסיטה בהמשך הלימודים.`
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
      officialSource: `https://arts.tau.ac.il/Music`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `חלים הסדרי המלגות של אוניברסיטת ת״א (מימון מהפיקדון לחיילים משוחררים; מלגות סיוע/הצטיינות), ובנוסף קרנות ייעודיות למוזיקה. (פרטים — אתר ביה״ס/ת״א.)`
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
