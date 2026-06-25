// אוניברסיטת אריאל בשומרון (Ariel University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`Ariel Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = Math.round(0.5 * psycho + 0.5 * normalizedBagrut);

  const programs = [
    { name: 'מדעי המחשב', threshold: 600 },
    { name: 'הנדסת חשמל', threshold: 640 },
    { name: 'פסיכולוגיה', threshold: 580 },
    { name: 'הנדסת מכונות', threshold: 615 },
    { name: 'כלכלה', threshold: 580 },
    { name: 'עבודה סוציאלית', threshold: 600 },
    { name: 'סיעוד', threshold: 570 },
    { name: 'אדריכלות', threshold: 573 },
    { name: 'תקשורת ועיתונאות', threshold: 580 },
    { name: 'קרימינולוגיה', threshold: 560 },
    { name: 'תזונה ודיאטטיקה', threshold: 620 }
  ];

  console.log('\nResults for Ariel University:');
  console.log(`---------------------------------------------------------------------------`);
  programs.forEach(p => {
    let status = 'Rejected (נדחה)';
    if (localSekhem >= p.threshold) status = 'Accepted (התקבל)';
    console.log(`${p.name}:`);
    console.log(`  - Computed Sekhem: ${localSekhem}`);
    console.log(`  - Required Threshold: ${p.threshold}`);
    console.log(`  - Status: ${status}`);
    console.log(`---------------------------------------------------------------------------`);
  });
}

main();