// האוניברסיטה העברית בירושלים (Hebrew University)
const zlib = require("zlib");

async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105;
  let psycho = 680;
  let track = "401-4100"; // Default track: Law

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
    if (args[i] === "--track" && args[i + 1]) track = args[i + 1];
  }

  console.log(
    `HUJI Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}, Track=${track}`,
  );

  try {
    const res = await fetch("https://go.huji.ac.il/jjson/huji.json.gz");
    const buffer = await res.arrayBuffer();
    const decompressed = zlib.gunzipSync(Buffer.from(buffer));
    const data = JSON.parse(decompressed.toString("utf8"));

    const allHogim = Object.values(data.hogimInfoObj);
    const prog = allHogim.find((h) => h.track_number === track);
    if (!prog) {
      console.log(`Track ${track} not found. Available tracks:`);
      allHogim
        .slice(0, 10)
        .forEach((h) => console.log(`- ${h.track_number}: ${h.track_name}`));
      return;
    }

    const formula = data.formulasObj.find(
      (f) => f.formula_type === prog.hog_regType,
    );
    if (!formula) {
      console.log(`No formula found for regType: ${prog.hog_regType}`);
      return;
    }

    const score =
      parseFloat(formula.formula_pet) * psycho +
      parseFloat(formula.formula_avg) * bagrut -
      parseFloat(formula.formula_minus);

    // Find threshold in current year
    const yearEntry = Object.values(data.currentYearObj).find(
      (y) => y.track_number === track,
    );
    let acceptThresh = 22.7;
    let rejectThresh = 22.0;
    if (yearEntry) {
      acceptThresh = parseFloat(yearEntry.safAccept) || acceptThresh;
      rejectThresh = parseFloat(yearEntry.safReject) || rejectThresh;
    }

    let status = "Pending (waiting for official decision)";
    if (score >= acceptThresh) status = "Accepted (ציון מעבר לחסם קבלה)";
    else if (score < rejectThresh) status = "Rejected (ציון מתחת לחסם דחייה)";

    console.log(`\nResults for HUJI - ${prog.track_name}:`);
    console.log(`- Computed Score: ${score.toFixed(3)}`);
    console.log(`- Acceptance Threshold: ${acceptThresh}`);
    console.log(`- Rejection Threshold: ${rejectThresh}`);
    console.log(`- Status: ${status}`);
  } catch (error) {
    console.error(
      "Failed to query HUJI calculator dynamically:",
      error.message,
    );
  }
}

main();
