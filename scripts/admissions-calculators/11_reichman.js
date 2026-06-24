// אוניברסיטת רייכמן (Reichman University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(
    `Reichman Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`,
  );

  // Adapted Score (ציון מתואם) Formula:
  // Adapted = 4.812 * BagrutAverage + 0.5131 * Psychometric - 163.19
  const adapted = 4.812 * bagrut + 0.5131 * psycho - 163.19;

  console.log("\nResults for Reichman University:");
  console.log(`- Computed Adapted Score (ציון מתואם): ${adapted.toFixed(2)}`);
  console.log("- Threshold Gates for Computer Science:");
  console.log("  * Adapted Score >= 675 -> Direct Acceptance");
  console.log("  * Adapted Score < 645 -> Direct Rejection");
  console.log("  * Otherwise -> Pending / Interview / Waiting List");
}

main();
