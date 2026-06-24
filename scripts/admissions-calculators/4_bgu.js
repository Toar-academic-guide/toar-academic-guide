// אוניברסיטת בן-גוריון בנגב (Ben-Gurion University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.5;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(`BGU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  // Base weighted formula: 50/50 formula on normalized bagrut
  const normalizedBagrut = (bagrut / 120) * 800;
  const localSekhem = 0.5 * psycho + 0.5 * normalizedBagrut;

  try {
    const payload = new URLSearchParams({
      rn_include_mitsraf: "0",
      rn_year: "2027",
      on_bagrut_average: String(bagrut),
      on_psychometry: String(psycho),
      on_final_sekem: "",
    }).toString();

    const response = await fetch(
      "https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload,
      },
    );

    const html = await response.text();
    const match = html.match(/on_final_sekem\.value\s*=\s*(\d+)/);
    const serverSekhem = match ? parseFloat(match[1]) : null;

    console.log("\nResults for Ben-Gurion University:");
    console.log(`- Computed General Sekhem: ${localSekhem.toFixed(1)}`);
    if (serverSekhem) {
      console.log(`- Server-Calculated Sekhem (API): ${serverSekhem}`);
    }
  } catch (error) {
    console.log("\nResults for Ben-Gurion University:");
    console.log(
      `- Computed General Sekhem: ${localSekhem.toFixed(1)} (Network API request offline)`,
    );
  }
}

main();
