// אוניברסיטת חיפה (University of Haifa)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;
  let math = 120;
  let english = 120;
  let verbal = 120;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
    if (args[i] === '--math' && args[i+1]) math = parseFloat(args[i+1]);
    if (args[i] === '--english' && args[i+1]) english = parseFloat(args[i+1]);
    if (args[i] === '--verbal' && args[i+1]) verbal = parseFloat(args[i+1]);
  }

  if (math === 120 && english === 120 && verbal === 120) {
    const share = Math.round(psycho / 5);
    math = share;
    verbal = share;
    english = share;
  }

  console.log(`Haifa Calculator Query: Bagrut=${bagrut}, Psychometric Subscores (Math=${math}, English=${english}, Verbal=${verbal})`);

  try {
    const connRes = await fetch('https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=checkConnection', {
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://applicants.haifa.ac.il/enrollmentChances/index.html'
      }
    });
    const connData = await connRes.json();
    const guid = connData.data.guid;

    const params = new URLSearchParams({
      operation: 'calculateChances',
      year: '2026',
      semester: '001',
      hug: 'SC0001',
      program: '52258372',
      bag_year: '2020',
      bag_type: '001',
      bag_avg: bagrut.toFixed(1),
      psy_year: '2021',
      psy_math: String(math),
      psy_english: String(english),
      psy_verbal: String(verbal)
    }).toString();

    const chancesRes = await fetch(`https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?${params}`, {
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://applicants.haifa.ac.il/enrollmentChances/index.html'
      }
    });
    const chancesData = await chancesRes.json();
    
    const programs = [
      { name: 'מדעי המחשב', threshold: 705 },
      { name: 'פסיכולוגיה', threshold: 650 },
      { name: 'משפטים', threshold: 680 },
      { name: 'כלכלה', threshold: 660 },
      { name: 'ביולוגיה', threshold: 640 },
      { name: 'עבודה סוציאלית', threshold: 615 },
      { name: 'סיעוד', threshold: 580 },
      { name: 'חשבונאות', threshold: 680 },
      { name: 'ריפוי בעיסוק', threshold: 610 },
      { name: 'תקשורת ועיתונאות', threshold: 550 },
      { name: 'מדע המדינה', threshold: 580 },
      { name: 'פיזיותרפיה', threshold: 680 }
    ];

    console.log('\nResults for University of Haifa:');
    console.log(`---------------------------------------------------------------------------`);
    if (chancesData && chancesData.data && chancesData.data[0]) {
      const items = chancesData.data[0].results[0].content;
      const scoreObj = items.find(i => i.label.includes('הציון המשוקלל'));
      const score = scoreObj ? parseFloat(scoreObj.value) : psycho;
      
      programs.forEach(p => {
        let status = 'Rejected (נדחה)';
        if (score >= p.threshold) status = 'Accepted (התקבל)';
        console.log(`${p.name}:`);
        console.log(`  - Computed Score: ${score}`);
        console.log(`  - Required Threshold: ${p.threshold}`);
        console.log(`  - Status: ${status}`);
        console.log(`---------------------------------------------------------------------------`);
      });
    } else {
      console.log('Unable to calculate score via API.');
    }
  } catch (error) {
    console.error('Failed to query Haifa calculator API:', error.message);
  }
}

main();