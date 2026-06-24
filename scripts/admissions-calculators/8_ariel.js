// אוניברסיטת אריאל בשומרון (Ariel University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(
    `Ariel Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`,
  );

  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = 0.5 * psycho + 0.5 * normalizedBagrut;

  console.log("\nResults for Ariel University:");
  console.log(`- Computed Composite Score: ${localSekhem.toFixed(1)}`);
  console.log(
    `Note: Online API is stateful, requires form lead registration, and Radware WAF bypass.`,
  );
}

main();
