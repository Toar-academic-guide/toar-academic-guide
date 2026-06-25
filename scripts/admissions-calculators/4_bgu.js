// אוניברסיטת בן-גוריון בנגב (Ben-Gurion University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.5;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`BGU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // Base weighted formula: 50/50 formula on normalized bagrut
  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = Math.round(0.5 * psycho + 0.5 * normalizedBagrut);

  const programs = [
    { name: 'מדעי המחשב', threshold: 645 },
    { name: 'הנדסת חשמל', threshold: 615 },
    { name: 'פסיכולוגיה', threshold: 675 },
    { name: 'הנדסת מכונות', threshold: 595 },
    { name: 'רפואה', threshold: 760 },
    { name: 'משפטים', threshold: 650 },
    { name: 'מנהל עסקים', threshold: 590 },
    { name: 'כלכלה', threshold: 615 },
    { name: 'מדעי הנתונים', threshold: 635 },
    { name: 'ביולוגיה', threshold: 580 },
    { name: 'עבודה סוציאלית', threshold: 560 },
    { name: 'סיעוד', threshold: 570 },
    { name: 'חשבונאות', threshold: 590 },
    { name: 'ריפוי בעיסוק', threshold: 600 },
    { name: 'פיזיותרפיה', threshold: 620 },
    { name: 'תזונה ודיאטטיקה', threshold: 600 }
  ];

  console.log('\nResults for Ben-Gurion University:');
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