// הטכניון (Technion)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(
    `Technion Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`,
  );

  // Official Technion formula
  const localSekhem = 0.5 * bagrut + 0.075 * psycho - 18;

  try {
    const payload = new URLSearchParams({
      bagrot: "true",
      yEnglish: "5",
      english: String(Math.round(bagrut)),
      yHebrew_lit: "2",
      hebrew_lit: String(Math.round(bagrut)),
      yMathematic: "5",
      mathematic: String(Math.round(bagrut)),
      yBible: "2",
      bible: String(Math.round(bagrut)),
      yEzrahut: "2",
      ezrahut: String(Math.round(bagrut)),
      yHabaa: "2",
      habaa: String(Math.round(bagrut)),
      yHistory: "2",
      history: String(Math.round(bagrut)),
      yHebrew: "2",
      hebrew: String(Math.round(bagrut)),
      handesae: "false",
      academic: "false",
      mehinaAve: "false",
      arc: "arcNo",
      psychometry: String(psycho),
      memuca: "sehem",
    }).toString();

    const response = await fetch(
      "https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          referer: "https://admissions.technion.ac.il/calculator/",
        },
        body: payload,
      },
    );

    const html = await response.text();
    const match = html.match(/הסכם לדיוני הקבלה הוא:(\d+\.?\d*)/);
    const serverSekhem = match ? parseFloat(match[1]) : null;

    console.log("\nResults for Technion:");
    console.log(`- Computed Sekhem (Formula-based): ${localSekhem.toFixed(2)}`);
    if (serverSekhem) {
      console.log(`- Server-Calculated Sekhem (API-based): ${serverSekhem}`);
    }
  } catch (error) {
    console.log("\nResults for Technion:");
    console.log(
      `- Computed Sekhem (Formula-based): ${localSekhem.toFixed(2)} (Network API request offline)`,
    );
  }
}

main();
