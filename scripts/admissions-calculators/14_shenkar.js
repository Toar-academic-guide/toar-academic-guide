// שנקר (Shenkar Design & Engineering)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
  }

  console.log('Results for Shenkar (Engineering & Design):');
  console.log(`---------------------------------------------------------------------------`);
  console.log(`- Calculated Bagrut Average: ${bagrut}`);
  console.log(`  - Direct Engineering Admission: ${bagrut >= 100 ? 'Accepted (התקבל)' : 'Rejected (נדחה)'}`);
  console.log(`Note: Admission to Design & Art departments depends heavily on specific entry exams.`);
  console.log(`---------------------------------------------------------------------------`);
}

main();