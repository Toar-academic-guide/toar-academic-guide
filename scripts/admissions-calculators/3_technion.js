// הטכניון (Technion)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`Technion Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // Official Technion formula
  const localSekhem = 0.5 * bagrut + 0.075 * psycho - 18;

  const programs = [
    { name: 'מדעי המחשב', threshold: 92 },
    { name: 'הנדסת חשמל', threshold: 88 },
    { name: 'הנדסת מכונות', threshold: 86 },
    { name: 'רפואה', threshold: 94 },
    { name: 'מדעי הנתונים', threshold: 90 },
    { name: 'אדריכלות', threshold: 87 }
  ];

  console.log('\nResults for Technion:');
  console.log(`---------------------------------------------------------------------------`);
  programs.forEach(p => {
    let status = 'Rejected (נדחה)';
    if (localSekhem >= p.threshold) status = 'Accepted (התקבל)';
    console.log(`${p.name}:`);
    console.log(`  - Computed Sekhem: ${localSekhem.toFixed(2)}`);
    console.log(`  - Required Threshold: ${p.threshold}`);
    console.log(`  - Status: ${status}`);
    console.log(`---------------------------------------------------------------------------`);
  });
}

main();