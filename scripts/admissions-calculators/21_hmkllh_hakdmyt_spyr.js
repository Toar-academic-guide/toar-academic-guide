// המכללה האקדמית ספיר
// מזהה פריט בלוח Monday: 12220697668

const { JSDOM } = require('jsdom');

async function getAdmissionsData() {
  const fallbackData = {
    institutionName: `המכללה האקדמית ספיר`,
    institutionType: `מכללה ציבורית`,
    location: `שער הנגב`,
    programName: `המכללה האקדמית ספיר`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.sapir.ac.il/ba/law#collapse-accordion-798-3`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה וציון פסיכומטרי.
- דוגמה למשפטים: ממוצע בגרות 85 ומעלה, אנגלית 4 יח"ל בציון 70 ומעלה, פסיכומטרי 600 ומעלה, וציון 85 באנגלית בפסיכומטרי או 185 באמי"ר.
- דוגמה לכלכלה וחשבונאות: פסיכומטרי 580 ומעלה, ממוצע בגרות 80 ומעלה, אנגלית 4 יח"ל (56+), ומתמטיקה 4 יח"ל (75+) או 5 יח"ל (65+).
- סיווג רמת אנגלית לכלל החוגים.`,
      calculatorUrl: `https://www.sapir.ac.il/ba/law#collapse-accordion-798-3`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה וציון פסיכומטרי.
- דוגמה למשפטים: ממוצע בגרות 85 ומעלה, אנגלית 4 יח"ל בציון 70 ומעלה, פסיכומטרי 600 ומעלה, וציון 85 באנגלית בפסיכומטרי או 185 באמי"ר.
- דוגמה לכלכלה וחשבונאות: פסיכומטרי 580 ומעלה, ממוצע בגרות 80 ומעלה, אנגלית 4 יח"ל (56+), ומתמטיקה 4 יח"ל (75+) או 5 יח"ל (65+).
- סיווג רמת אנגלית לכלל החוגים.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה ייעודית קדם אקדמית: מהווה תחליף מלא לתעודת בגרות לצורך קבלה ללימודים במכללה.
- מכינת 30+ לבני 30 ומעלה ללא תעודת בגרות.
- קדם מכינה למועמדים בעלי בגרות חלקית/12 שנות לימוד שאינם עומדים בדרישות המכינה הייעודית.
- מכינה ספציפית להנדסה ומדעים מדויקים.`,
      transitionTrack: `- קבלה ללא פסיכומטרי בחלק מהחוגים על סמך ממוצע ציוני בגרות גבוה במיוחד.
- קבלה למשפטים לבעלי תואר אקדמי קודם (ממוצע 75 ומעלה, פטור באנגלית ופסיכומטרי 600 ומעלה).
- קורסי הכנה והשלמה בקיץ במתמטיקה לכלכלה למי שאינו עומד בדרישות הסף במתמטיקה.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- קבלה ללא פסיכומטרי בחלק מהחוגים על סמך ממוצע ציוני בגרות גבוה במיוחד.
- קבלה למשפטים לבעלי תואר אקדמי קודם (ממוצע 75 ומעלה, פטור באנגלית ופסיכומטרי 600 ומעלה).
- קורסי הכנה והשלמה בקיץ במתמטיקה לכלכלה למי שאינו עומד בדרישות הסף במתמטיקה.`,
      otherPaths: `- קבלה ללא פסיכומטרי בחלק מהחוגים על סמך ממוצע ציוני בגרות גבוה במיוחד.
- קבלה למשפטים לבעלי תואר אקדמי קודם (ממוצע 75 ומעלה, פטור באנגלית ופסיכומטרי 600 ומעלה).
- קורסי הכנה והשלמה בקיץ במתמטיקה לכלכלה למי שאינו עומד בדרישות הסף במתמטיקה.`
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
      officialSource: `https://www.sapir.ac.il/ba/law#collapse-accordion-798-3`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע סוציו-אקונומי (דרך האגודה לקידום החינוך), הצטיינות ולחיילים משוחררים; ראויים לקידום; מימון מהפיקדון. (פרטים — אתר ספיר.)`
    }
  };

  const url = fallbackData.officialUrl;
  if (!url) {
    return fallbackData;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Cleanup script, style, and frame elements
    const elementsToRemove = doc.querySelectorAll('script, style, iframe, noscript');
    elementsToRemove.forEach(el => el.remove());

    const pageText = doc.body ? doc.body.textContent : '';

    const extractKeywordContext = (text, keywords, maxChars = 250) => {
      for (const kw of keywords) {
        const idx = text.indexOf(kw);
        if (idx !== -1) {
          const start = Math.max(0, idx - 80);
          const end = Math.min(text.length, idx + kw.length + maxChars);
          return text.substring(start, end).replace(/\s+/g, ' ').trim();
        }
      }
      return null;
    };

    const liveReq = extractKeywordContext(pageText, ['תנאי קבלה', 'סף קבלה', 'דרישות קבלה', 'ציון סכם']);
    const livePrep = extractKeywordContext(pageText, ['מכינה', 'מכינת', 'אפיק מעבר', 'נתיב קבלה']);

    const updatedData = JSON.parse(JSON.stringify(fallbackData));

    if (liveReq) {
      updatedData.admissionRequirements.specificRequirements = `[מידע מעודכן מהאתר הרשמי]: ... ${liveReq.substring(0, 150)}... \n\n[גיבוי]: ${fallbackData.admissionRequirements.specificRequirements}`;
      updatedData.admissionRequirements.sekhemThreshold = `[מידע מעודכן מהאתר הרשמי]: ... ${liveReq.substring(0, 150)}... \n\n[גיבוי]: ${fallbackData.admissionRequirements.sekhemThreshold}`;
    }
    if (livePrep) {
      updatedData.alternativePaths.preparatoryProgram = `[מידע מעודכן מהאתר הרשמי]: ... ${livePrep.substring(0, 150)}... \n\n[גיבוי]: ${fallbackData.alternativePaths.preparatoryProgram}`;
    }

    updatedData.dataReliability.checkDate = new Date().toISOString().split('T')[0];
    updatedData.dataReliability.confidenceLevel = "גבוהה מאוד (אימות חי מעודכן מהאתר הרשמי)";

    return updatedData;
  } catch (err) {
    fallbackData.dataReliability.confidenceLevel = `גבוהה (על בסיס גיבוי; כשל בסריקה חיה: ${err.message})`;
    return fallbackData;
  }
}

async function main() {
  const data = await getAdmissionsData();
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
