// אוניברסיטת בר-אילן (Bar-Ilan University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`BIU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // BIU weighted formula fallback:
  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = Math.round(0.5 * psycho + 0.5 * normalizedBagrut);

  const programs = [
    { name: 'מדעי המחשב', threshold: 675 },
    { name: 'הנדסת חשמל', threshold: 655 },
    { name: 'פסיכולוגיה', threshold: 665 },
    { name: 'רפואה', threshold: 740 },
    { name: 'משפטים', threshold: 685 },
    { name: 'כלכלה', threshold: 570 },
    { name: 'ביולוגיה', threshold: 570 },
    { name: 'עבודה סוציאלית', threshold: 600 },
    { name: 'קרימינולוגיה', threshold: 560 }
  ];

  console.log('\nResults for Bar-Ilan University:');
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