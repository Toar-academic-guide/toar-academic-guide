// אוניברסיטת תל אביב (Tel Aviv University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.5;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`TAU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  try {
    const response = await fetch('https://go.tau.ac.il/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        operationName: "getLastScore",
        variables: {
          scoresData: {
            prog: "calctziun",
            out: "json",
            reali10: 0,
            psicho: String(psycho),
            bagrut: String(bagrut)
          }
        },
        query: "query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }"
      })
    });

    const result = await response.json();
    const scores = typeof result.data.getLastScore.body === 'string' ? JSON.parse(result.data.getLastScore.body) : result.data.getLastScore.body;

    const programs = [
      { name: 'מדעי המחשב', threshold: 700, score: Math.round(scores.hatama_meduyakim || scores.hatama) },
      { name: 'הנדסת חשמל', threshold: 655, score: Math.round(scores.hatama_handasa || scores.hatama) },
      { name: 'פסיכולוגיה', threshold: 720, score: Math.round(scores.hatama) },
      { name: 'הנדסת מכונות', threshold: 640, score: Math.round(scores.hatama_handasa || scores.hatama) },
      { name: 'רפואה', threshold: 770, score: Math.round(scores.hatama_refua || scores.hatama) },
      { name: 'משפטים', threshold: 695, score: Math.round(scores.hatama) },
      { name: 'מנהל עסקים', threshold: 640, score: Math.round(scores.hatama_nihul || scores.hatama) },
      { name: 'כלכלה', threshold: 670, score: Math.round(scores.hatama) },
      { name: 'מדעי הנתונים', threshold: 688, score: Math.round(scores.hatama_meduyakim || scores.hatama) },
      { name: 'ביולוגיה', threshold: 630, score: Math.round(scores.hatama) },
      { name: 'עבודה סוציאלית', threshold: 600, score: Math.round(scores.hatama) },
      { name: 'סיעוד', threshold: 610, score: Math.round(scores.hatama) },
      { name: 'חשבונאות', threshold: 640, score: Math.round(scores.hatama_nihul || scores.hatama) },
      { name: 'ריפוי בעיסוק', threshold: 640, score: Math.round(scores.hatama) },
      { name: 'אדריכלות', threshold: 650, score: Math.round(scores.hatama) },
      { name: 'תקשורת ועיתונאות', threshold: 640, score: Math.round(scores.hatama) },
      { name: 'מדע המדינה', threshold: 620, score: Math.round(scores.hatama) },
      { name: 'חינוך והוראה', threshold: 590, score: Math.round(scores.hatama) },
      { name: 'פיזיותרפיה', threshold: 660, score: Math.round(scores.hatama) },
      { name: 'תזונה ודיאטטיקה', threshold: 640, score: Math.round(scores.hatama) }
    ];

    console.log('\nResults for Tel Aviv University:');
    console.log(`---------------------------------------------------------------------------`);
    programs.forEach(p => {
      let status = 'Rejected (נדחה)';
      if (p.score >= p.threshold) status = 'Accepted (התקבל)';
      console.log(`${p.name}:`);
      console.log(`  - Computed Sekhem: ${p.score}`);
      console.log(`  - Required Threshold: ${p.threshold}`);
      console.log(`  - Status: ${status}`);
      console.log(`---------------------------------------------------------------------------`);
    });
  } catch (error) {
    console.error('Failed to query TAU calculator API:', error.message);
  }
}

main();