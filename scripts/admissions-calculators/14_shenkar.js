// שנקר (Shenkar Design & Engineering)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
  }

  console.log("Results for Shenkar (Engineering & Design):");
  console.log(`- Calculated Bagrut Average: ${bagrut}`);
  console.log(
    `Note: Shenkar calculates Bagrut average only on their admission form.`,
  );
  console.log(
    `Admission depends heavily on department-specific exams/portfolios for Design/Art.`,
  );
}

main();
