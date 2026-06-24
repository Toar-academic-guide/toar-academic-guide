// המכללה האקדמית סמי שמעון SCE
// מזהה פריט בלוח Monday: 12220708940

function getAdmissionsData() {
  return {
    institutionName: `המכללה האקדמית סמי שמעון SCE`,
    institutionType: `מכללה ציבורית`,
    location: `באר שבע ואשדוד`,
    programName: `המכללה האקדמית סמי שמעון SCE`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.sce.ac.il/candidates/branch/admission_conditions_and_tuition_fees`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה או תעודת מכינה.
- ציון פסיכומטרי או פסיכוטכני פנימי של 580 ומעלה.
- בגרות במתמטיקה: 5 יח"ל בציון 70 ומעלה, או 4 יח"ל בציון 85 ומעלה.
- מבחן רמה בעברית לנבחנים בפסיכומטרי בשפה זרה.`,
      calculatorUrl: `https://www.sce.ac.il/candidates/branch/admission_conditions_and_tuition_fees`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה או תעודת מכינה.
- ציון פסיכומטרי או פסיכוטכני פנימי של 580 ומעלה.
- בגרות במתמטיקה: 5 יח"ל בציון 70 ומעלה, או 4 יח"ל בציון 85 ומעלה.
- מבחן רמה בעברית לנבחנים בפסיכומטרי בשפה זרה.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם-אקדמית ייעודית: מיועדת להשלמת תעודת בגרות או לשיפור והשלמת הדרישות במתמטיקה ופיזיקה.
- עלות המכינה: 1,500 ש"ח.
- מציעה מימון של עד 100% לזכאיות דרך קרנות כגון "טנא אלומה".`,
      transitionTrack: `- קבלה על סמך מכינה ייעודית להנדסה המשמשת תחליף מלא לתעודת הבגרות.
- קבלה על סמך שקלול הישגים מיוחדים לבעלי רקע מקצועי/הנדסאים.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה על סמך מכינה ייעודית להנדסה המשמשת תחליף מלא לתעודת הבגרות.
- קבלה על סמך שקלול הישגים מיוחדים לבעלי רקע מקצועי/הנדסאים.`,
      otherPaths: `- קבלה על סמך מכינה ייעודית להנדסה המשמשת תחליף מלא לתעודת הבגרות.
- קבלה על סמך שקלול הישגים מיוחדים לבעלי רקע מקצועי/הנדסאים.`
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
      officialSource: `https://www.sce.ac.il/candidates/branch/admission_conditions_and_tuition_fees`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות על בסיס סוציו-אקונומי, הצטיינות ולחיילים משוחררים; ראויים לקידום ומלגות דרך האגודה לקידום החינוך. (פרטים — אתר SCE.)`
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
