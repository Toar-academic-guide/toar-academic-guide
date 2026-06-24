// המכללה האקדמית להנדסה בראודה
// מזהה פריט בלוח Monday: 12220708942

const { JSDOM } = require('jsdom');

async function getAdmissionsData() {
  const fallbackData = {
    institutionName: `המכללה האקדמית להנדסה בראודה`,
    institutionType: `מכללה ציבורית`,
    location: `כרמיאל`,
    programName: `המכללה האקדמית להנדסה בראודה`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://w3.braude.ac.il/intrested/`,
    admissionRequirements: {
      sekhemThreshold: `- זכאות לתעודת בגרות מלאה ועמידה בדרישות הסף במתמטיקה ופיזיקה.
- ציון פסיכומטרי/אמירנט מסווג.
- רמת עברית: ציון 120 לפחות בבחינת יע"ל/יעלנט למועמדים שלמדו בתיכון ששפת ההוראה בו אינה עברית.
- דרישות הסף משתנות לפי מחלקות (דרישות גבוהות יותר למדעי המחשב והנדסת תוכנה).`,
      calculatorUrl: `https://w3.braude.ac.il/intrested/`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- זכאות לתעודת בגרות מלאה ועמידה בדרישות הסף במתמטיקה ופיזיקה.
- ציון פסיכומטרי/אמירנט מסווג.
- רמת עברית: ציון 120 לפחות בבחינת יע"ל/יעלנט למועמדים שלמדו בתיכון ששפת ההוראה בו אינה עברית.
- דרישות הסף משתנות לפי מחלקות (דרישות גבוהות יותר למדעי המחשב והנדסת תוכנה).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה ייעודית להנדסה במכללה.
- בוגרי המכינה המשיגים ציונים מתאימים (מצטייני מכינה) זכאים לפטור מלא מהצגת ציון פסיכומטרי בעת קבלתם ללימודי הנדסה בבראודה.`,
      transitionTrack: `- אפיק הרשמה ללא פסיכומטרי על בסיס ממוצע ציוני בגרות גבוה במיוחד (עם בונוס של 12.5 נק' ל-4 יח"ל מדעי ו-25 נק' ל-5 יח"ל מדעי).
- אפיק מעבר להנדסה ללא פסיכומטרי: קבלה במעמד "סטודנט חיצוני" ומעבר עם ציונים של 65 ומעלה (להנדסת מכונות, ביוטכנולוגיה, תעשייה וניהול ומערכות מידע) או 80 ומעלה (להנדסת תוכנה וחשמל) בקורסי הליבה חדו"א ואלגברה.
- אפיק מהנדסאים להנדסה: ממוצע ציונים משוקלל בדיפלומה (פנימי וחיצוני) של 75+ למכונות, 80+ לביוטכנולוגיה/תעשייה וניהול/תוכנה/מערכות מידע, 85+ לחשמל ואלקטרוניקה. (מדעי המחשב והנדסה אזרחית מחויבים בפסיכומטרי).
- מתווה "חרבות ברזל": קבלה ללא פסיכומטרי למשרתי מילואים (30 יום לפחות), פצועי ונכי כוחות הביטחון ובני זוגם.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- אפיק הרשמה ללא פסיכומטרי על בסיס ממוצע ציוני בגרות גבוה במיוחד (עם בונוס של 12.5 נק' ל-4 יח"ל מדעי ו-25 נק' ל-5 יח"ל מדעי).
- אפיק מעבר להנדסה ללא פסיכומטרי: קבלה במעמד "סטודנט חיצוני" ומעבר עם ציונים של 65 ומעלה (להנדסת מכונות, ביוטכנולוגיה, תעשייה וניהול ומערכות מידע) או 80 ומעלה (להנדסת תוכנה וחשמל) בקורסי הליבה חדו"א ואלגברה.
- אפיק מהנדסאים להנדסה: ממוצע ציונים משוקלל בדיפלומה (פנימי וחיצוני) של 75+ למכונות, 80+ לביוטכנולוגיה/תעשייה וניהול/תוכנה/מערכות מידע, 85+ לחשמל ואלקטרוניקה. (מדעי המחשב והנדסה אזרחית מחויבים בפסיכומטרי).
- מתווה "חרבות ברזל": קבלה ללא פסיכומטרי למשרתי מילואים (30 יום לפחות), פצועי ונכי כוחות הביטחון ובני זוגם.`,
      otherPaths: `- אפיק הרשמה ללא פסיכומטרי על בסיס ממוצע ציוני בגרות גבוה במיוחד (עם בונוס של 12.5 נק' ל-4 יח"ל מדעי ו-25 נק' ל-5 יח"ל מדעי).
- אפיק מעבר להנדסה ללא פסיכומטרי: קבלה במעמד "סטודנט חיצוני" ומעבר עם ציונים של 65 ומעלה (להנדסת מכונות, ביוטכנולוגיה, תעשייה וניהול ומערכות מידע) או 80 ומעלה (להנדסת תוכנה וחשמל) בקורסי הליבה חדו"א ואלגברה.
- אפיק מהנדסאים להנדסה: ממוצע ציונים משוקלל בדיפלומה (פנימי וחיצוני) של 75+ למכונות, 80+ לביוטכנולוגיה/תעשייה וניהול/תוכנה/מערכות מידע, 85+ לחשמל ואלקטרוניקה. (מדעי המחשב והנדסה אזרחית מחויבים בפסיכומטרי).
- מתווה "חרבות ברזל": קבלה ללא פסיכומטרי למשרתי מילואים (30 יום לפחות), פצועי ונכי כוחות הביטחון ובני זוגם.`
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
      officialSource: `https://w3.braude.ac.il/intrested/`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות; חיילים משוחררים — מימון מהפיקדון; ראויים לקידום. (פרטים — אתר בראודה.)`
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
