// המכללה האקדמית תל-חי
// מזהה פריט בלוח Monday: 12220697669

function getAdmissionsData() {
  return {
    institutionName: `המכללה האקדמית תל-חי`,
    institutionType: `אוניברסיטה ציבורית`,
    location: `גליל עליון`,
    programName: `המכללה האקדמית תל-חי`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.telhai.ac.il/%D7%AA%D7%94%D7%9C%D7%99%D7%9A_%D7%94%D7%A7%D7%91%D7%9C%D7%94`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה או תעודה שוות ערך (כגון בגרות מחו"ל בכפוף לאישור משרד החינוך, או דיפלומת הנדסאים).
- ציון פסיכומטרי או ציון מצרף/משוקלל מחליף פסיכומטרי.
- סיווג רמת אנגלית (פסיכומטרי או מבחן אמירנט) בציון 85 לפחות (מתחת ל-85 קבלה על תנאי).
- ציון במבחן ידע בעברית (יע"ל/יעלנט) למי ששפת ההוראה בביה"ס התיכון שלו לא הייתה עברית: 86 ומעלה למדעי המחשב, 100 ומעלה לשאר חוגי המדעים, 110 ומעלה לחברה ורוח/חינוך.`,
      calculatorUrl: `https://www.telhai.ac.il/%D7%AA%D7%94%D7%9C%D7%99%D7%9A_%D7%94%D7%A7%D7%91%D7%9C%D7%94`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה או תעודה שוות ערך (כגון בגרות מחו"ל בכפוף לאישור משרד החינוך, או דיפלומת הנדסאים).
- ציון פסיכומטרי או ציון מצרף/משוקלל מחליף פסיכומטרי.
- סיווג רמת אנגלית (פסיכומטרי או מבחן אמירנט) בציון 85 לפחות (מתחת ל-85 קבלה על תנאי).
- ציון במבחן ידע בעברית (יע"ל/יעלנט) למי ששפת ההוראה בביה"ס התיכון שלו לא הייתה עברית: 86 ומעלה למדעי המחשב, 100 ומעלה לשאר חוגי המדעים, 110 ומעלה לחברה ורוח/חינוך.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם-אקדמית ייעודית שנתית: ממוצע ציוני המכינה מחליף את ממוצע הבגרות לצורך קבלה לחוגים השונים.
- מכינת 30+ לבני 30 ומעלה ללא בגרות: מיועדת לפקולטה למדעי החברה והרוח ולפקולטה לחינוך והוראה.
- מכינת חממ"ה ללקויי למידה: מכינה ייעודית עם תמיכה מוגברת.
- מכינת עברית בקיץ למועמדים שלא הגיעו לרף הציון הנדרש במבחן יע"ל.`,
      transitionTrack: `- בני 30 ומעלה פטורים מהצגת ציון פסיכומטרי (נדרשת בגרות ועמידה במבחן אמירנט).
- ציון מצרף מחליף פסיכומטרי לפקולטות למדעים וחברה/רוח על בסיס מקצועות הליבה בבגרות ללא ציוני מגן.
- ציון משוקלל מחליף פסיכומטרי לפקולטה לחינוך והוראה.
- קבלה על בסיס דיפלומת הנדסאים.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- בני 30 ומעלה פטורים מהצגת ציון פסיכומטרי (נדרשת בגרות ועמידה במבחן אמירנט).
- ציון מצרף מחליף פסיכומטרי לפקולטות למדעים וחברה/רוח על בסיס מקצועות הליבה בבגרות ללא ציוני מגן.
- ציון משוקלל מחליף פסיכומטרי לפקולטה לחינוך והוראה.
- קבלה על בסיס דיפלומת הנדסאים.`,
      otherPaths: `- בני 30 ומעלה פטורים מהצגת ציון פסיכומטרי (נדרשת בגרות ועמידה במבחן אמירנט).
- ציון מצרף מחליף פסיכומטרי לפקולטות למדעים וחברה/רוח על בסיס מקצועות הליבה בבגרות ללא ציוני מגן.
- ציון משוקלל מחליף פסיכומטרי לפקולטה לחינוך והוראה.
- קבלה על בסיס דיפלומת הנדסאים.`
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
      officialSource: `https://www.telhai.ac.il/%D7%AA%D7%94%D7%9C%D7%99%D7%9A_%D7%94%D7%A7%D7%91%D7%9C%D7%94`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `הטבת שנת לימודים ראשונה חינם (מלאי מוגבל). מלגות תואר: 4,000 ₪ לשנים ב׳–ג׳ (תוכנית מלאה 20+ נ״ז); מלגה נוספת למשרתי מילואים/כוחות הצלה וביטחון. חיילים משוחררים — מימון מהפיקדון. מרכז תמיכה ללקויות.`
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
