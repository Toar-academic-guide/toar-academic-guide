// המכללה האקדמית בוינגייט
// מזהה פריט בלוח Monday: 12220699121

function getAdmissionsData() {
  return {
    institutionName: `המכללה האקדמית בוינגייט`,
    institutionType: `מכללה ציבורית`,
    location: `נתניה`,
    programName: `המכללה האקדמית בוינגייט`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.wingate.org.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה.
- ציון פסיכומטרי.
- ציון סכם משולב (בגרות ופסיכומטרי) של כ-540 ומעלה לתואר ראשון בחינוך גופני (B.Ed.).
- מעבר ימי מיון מעשיים, מבחני התאמה וראיון קבלה אישי לבדיקת התאמה פיזית ואישיותית לחינוך גופני.
- סיווג רמת אנגלית (פסיכומטרי/אמירנט/אמי"ר).`,
      calculatorUrl: `https://www.wingate.org.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה.
- ציון פסיכומטרי.
- ציון סכם משולב (בגרות ופסיכומטרי) של כ-540 ומעלה לתואר ראשון בחינוך גופני (B.Ed.).
- מעבר ימי מיון מעשיים, מבחני התאמה וראיון קבלה אישי לבדיקת התאמה פיזית ואישיותית לחינוך גופני.
- סיווג רמת אנגלית (פסיכומטרי/אמירנט/אמי"ר).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה ייעודית ללימודים אקדמיים: מיועדת לשיפור או השלמת תעודת הבגרות.
- תעודת סיום המכינה הייעודית מהווה תחליף לתעודת בגרות לצורך קבלה ללימודים במוסד.
- תנאי קבלה למכינה: 12 שנות לימוד, וציון במבחן פסיכומטרי או מבחן מימ"ד.
- מכינות ייעודיות ומותאמות לבני 30 ומעלה.`,
      transitionTrack: `- מסלול מותאם לספורטאים ומאמנים פעילים בעלי הישגים משמעותיים ברמה הלאומית או הבינלאומית.
- ליווי וייעוץ אישי לבניית מסלול קבלה והשלמות למועמדים בעלי נתונים חריגים.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- מסלול מותאם לספורטאים ומאמנים פעילים בעלי הישגים משמעותיים ברמה הלאומית או הבינלאומית.
- ליווי וייעוץ אישי לבניית מסלול קבלה והשלמות למועמדים בעלי נתונים חריגים.`,
      otherPaths: `- מסלול מותאם לספורטאים ומאמנים פעילים בעלי הישגים משמעותיים ברמה הלאומית או הבינלאומית.
- ליווי וייעוץ אישי לבניית מסלול קבלה והשלמות למועמדים בעלי נתונים חריגים.`
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
      officialSource: `https://www.wingate.org.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: ``
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
