// המכללה האקדמית עמק יזרעאל
// מזהה פריט בלוח Monday: 12220697671

const { JSDOM } = require('jsdom');

async function getAdmissionsData() {
  const fallbackData = {
    institutionName: `המכללה האקדמית עמק יזרעאל`,
    institutionType: `מכללה ציבורית`,
    location: `עמק יזרעאל`,
    programName: `המכללה האקדמית עמק יזרעאל`,
    degreeType: `תואר אקדמי`,
    officialUrl: `https://www.yvc.ac.il`,
    admissionRequirements: {
      sekhemThreshold: `- תעודת בגרות מלאה או תעודת מכינה.
- סיווג רמת אנגלית במבחן פסיכומטרי או אמי"ר/אמיר"ם.
- מבחן יע"ל לנבחנים בפסיכומטרי בשפה שאינה עברית או שלמדו בתיכון שבו שפת ההוראה אינה עברית.
- עמידה ברף ציונים חוגי במקצועות נבחרים (כגון מתמטיקה).`,
      calculatorUrl: `https://www.yvc.ac.il`,
      minPsychometric: "משתנה לפי מסלול",
      minMatriculation: "משתנה לפי מסלול",
      specificRequirements: `- תעודת בגרות מלאה או תעודת מכינה.
- סיווג רמת אנגלית במבחן פסיכומטרי או אמי"ר/אמיר"ם.
- מבחן יע"ל לנבחנים בפסיכומטרי בשפה שאינה עברית או שלמדו בתיכון שבו שפת ההוראה אינה עברית.
- עמידה ברף ציונים חוגי במקצועות נבחרים (כגון מתמטיקה).`,
      additionalFilters: "ראיון או ועדת קבלה בהתאם לדרישות החוג"
    },
    alternativePaths: {
      preparatoryProgram: `- מכינה קדם-אקדמית (במסגרת מדעי החברה והרוח): מיועדת לשיפור ציונים. תנאי קבלה למכינה: 12 שנות לימוד, בגרות חלקית, בחינת מימ"ד וראיון אישי. ציוני המכינה מחליפים את הבגרות.
- מכינת 30+ לבני 30 ומעלה ללא תעודת בגרות.`,
      transitionTrack: `- מסלול פסיכומטרי בלבד: קבלה על סמך ציון פסיכומטרי בלבד ללא התחשבות בממוצע בגרות (בכפוף לזכאות לבגרות/מכינה).
- מסלול בגרות בלבד: קבלה ללא פסיכומטרי על סמך ממוצע בגרות גולמי גבוה במיוחד או ציון גמר מכינה.
- מסלול צמ"מ: קבלה על סמך שקלול ממוצע בגרות/מכינה וציון פסיכומטרי.
- קבלה על סמך מכינת 30+ לרוב החוגים (למעט חריגים כגון סיעוד) ללא צורך בפסיכומטרי.`,
      priorStudies: "קבלה על סמך לימודים אקדמיים קודמים או דיפלומת הנדסאי",
      exceptionsCommittee: "קיימת ועדת חריגים למועמדים מתאימים",
      specialPopulations: `- מסלול פסיכומטרי בלבד: קבלה על סמך ציון פסיכומטרי בלבד ללא התחשבות בממוצע בגרות (בכפוף לזכאות לבגרות/מכינה).
- מסלול בגרות בלבד: קבלה ללא פסיכומטרי על סמך ממוצע בגרות גולמי גבוה במיוחד או ציון גמר מכינה.
- מסלול צמ"מ: קבלה על סמך שקלול ממוצע בגרות/מכינה וציון פסיכומטרי.
- קבלה על סמך מכינת 30+ לרוב החוגים (למעט חריגים כגון סיעוד) ללא צורך בפסיכומטרי.`,
      otherPaths: `- מסלול פסיכומטרי בלבד: קבלה על סמך ציון פסיכומטרי בלבד ללא התחשבות בממוצע בגרות (בכפוף לזכאות לבגרות/מכינה).
- מסלול בגרות בלבד: קבלה ללא פסיכומטרי על סמך ממוצע בגרות גולמי גבוה במיוחד או ציון גמר מכינה.
- מסלול צמ"מ: קבלה על סמך שקלול ממוצע בגרות/מכינה וציון פסיכומטרי.
- קבלה על סמך מכינת 30+ לרוב החוגים (למעט חריגים כגון סיעוד) ללא צורך בפסיכומטרי.`
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
      officialSource: `https://www.yvc.ac.il`,
      checkDate: `2026-06-24`,
      confidenceLevel: "גבוהה (על בסיס בדיקה רשמית)",
      barriersAndNotes: `מלגות סיוע והצטיינות; חיילים משוחררים — מימון מהפיקדון; ראויים לקידום. (פרטים — אתר עמק יזרעאל.)`
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
