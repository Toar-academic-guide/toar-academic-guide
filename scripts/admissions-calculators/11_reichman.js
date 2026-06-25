// אוניברסיטת רייכמן (Reichman University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`Reichman Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // Adapted Score (ציון מתואם) Formula:
  // Adapted = 4.812 * BagrutAverage + 0.5131 * Psychometric - 163.19
  const adapted = 4.812 * bagrut + 0.5131 * psycho - 163.19;

  let status = 'Pending / Interview (ממתין/ראיון)';
  if (adapted >= 675) status = 'Accepted (התקבל)';
  else if (adapted < 645) status = 'Rejected (נדחה)';

  console.log('\nResults for Reichman University:');
  console.log(`---------------------------------------------------------------------------`);
  console.log(`מדעי המחשב:`);
  console.log(`  - Computed Adapted Score (ציון מתואם): ${adapted.toFixed(2)}`);
  console.log(`  - Direct Acceptance Threshold: 675`);
  console.log(`  - Direct Rejection Threshold: 645`);
  console.log(`  - Status: ${status}`);
  console.log(`---------------------------------------------------------------------------`);
}

main();