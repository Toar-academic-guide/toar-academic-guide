// עזריאלי - מכללה אקדמית להנדסה
// מזהה פריט בלוח Monday: 12220708941

const { JSDOM } = require('jsdom');

async function getAdmissionsData() {
  const fallbackData = {
    institutionName: `עזריאלי - מכללה אקדמית להנדסה`,
    institutionType: `מכללה ציבורית`,
    location: `ירושלים`,
    programName: `עזריאלי - מכללה אקדמית להנדסה`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.jce.ac.il/candidates/candidates-information-admission-procedures/#tab_1402_1`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה.
- מעבר מבחן פסיכומטרי או מבחן תיל (מבחן התאמה פנימי).
- עמידה ברפי הקבלה המשולבים (בגרות ופסיכומטרי) בהתאם למחלקה המבוקשת.
- סיווג רמת אנגלית ומעבר קורסי הכנה מוקדמים (פיזיקה, תכנות, אנגלית) במידת הצורך.`,
      calculatorUrl: `https://www.jce.ac.il/candidates/candidates-information-admission-procedures/#tab_1402_1`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה.
- מעבר מבחן פסיכומטרי או מבחן תיל (מבחן התאמה פנימי).
- עמידה ברפי הקבלה המשולבים (בגרות ופסיכומטרי) בהתאם למחלקה המבוקשת.
- סיווג רמת אנגלית ומעבר קורסי הכנה מוקדמים (פיזיקה, תכנות, אנגלית) במידת הצורך.`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם-אקדמית ייעודית ללימודי הנדסה: מיועדת למועמדים שאינם עומדים בתנאי הקבלה הישירים למחלקות השונות.
- המכינה מאפשרת שיפור ציונים במקצועות הליבה הטכנולוגיים כחלופה לרישום ישיר.`,
      transitionTrack: `- אפיקי קבלה עוקפי פסיכומטרי על סמך ממוצע ציוני בגרות גבוהים במיוחד.
- מסלול קבלה חריג (עד 10% מסך המתקבלים) בכפוף לדיון בוועדת קבלה אקדמית.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- אפיקי קבלה עוקפי פסיכומטרי על סמך ממוצע ציוני בגרות גבוהים במיוחד.
- מסלול קבלה חריג (עד 10% מסך המתקבלים) בכפוף לדיון בוועדת קבלה אקדמית.`,
      otherPaths: `- אפיקי קבלה עוקפי פסיכומטרי על סמך ממוצע ציוני בגרות גבוהים במיוחד.
- מסלול קבלה חריג (עד 10% מסך המתקבלים) בכפוף לדיון בוועדת קבלה אקדמית.`
    },
    alternatives: {
      similarProgramsSameInstitution: [
        "חוגי הנדסה אחרים (מכונות, תעשייה וניהול), או מסלולי B.Sc. במדעים"
      ],
      sameProgramOtherInstitutions: [
        "מכללות להנדסה כגון אפקה, בראודה, סמי שמעון, או HIT"
      ],
      lowerThresholdInstitutions: [
        "לימודי הנדסאי במכללות טכנולוגיות או קבלה מותנית במכינה"
      ]
    },
    dataReliability: {
      officialSource: `https://www.jce.ac.il/candidates/candidates-information-admission-procedures/#tab_1402_1`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות; חיילים משוחררים — מימון מהפיקדון; ראויים לקידום. (פרטים — אתר עזריאלי/JCE.)`
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
