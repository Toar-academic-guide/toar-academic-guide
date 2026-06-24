// אוניברסיטת בר-אילן (Bar-Ilan University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(`BIU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // BIU weighted formula fallback:
  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = 0.5 * psycho + 0.5 * normalizedBagrut;

  console.log("\nResults for Bar-Ilan University:");
  console.log(`- Computed Sekhem (Formula-based): ${localSekhem.toFixed(1)}`);
  console.log(
    `Note: Online API requires Radware WAF verification cookies and ASP.NET ViewState.`,
  );
}

main();
