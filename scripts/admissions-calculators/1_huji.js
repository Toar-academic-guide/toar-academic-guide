// האוניברסיטה העברית בירושלים (Hebrew University)
const zlib = require('zlib');

async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105;
  let psycho = 680;
  let track = 'all';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
    if (args[i] === '--track' && args[i+1]) track = args[i+1];
  }

  console.log(`HUJI Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}, TrackFilter=${track}`);

  try {
    const res = await fetch('https://go.huji.ac.il/jjson/huji.json.gz');
    const buffer = await res.arrayBuffer();
    const decompressed = zlib.gunzipSync(Buffer.from(buffer));
    const data = JSON.parse(decompressed.toString('utf8'));

    const allHogim = Object.values(data.hogimInfoObj);
    const results = [];

    for (const prog of allHogim) {
      if (!prog.track_number || !prog.hog_regType) continue;
      if (track !== 'all' && prog.track_number !== track) continue;

      const formula = data.formulasObj.find(f => f.formula_type === prog.hog_regType);
      if (!formula) continue;

      const score = parseFloat(formula.formula_pet) * psycho + parseFloat(formula.formula_avg) * bagrut - parseFloat(formula.formula_minus);
      
      const yearEntry = Object.values(data.currentYearObj).find(y => y.track_number === prog.track_number);
      if (!yearEntry) continue;

      const acceptThresh = parseFloat(yearEntry.safAccept);
      const rejectThresh = parseFloat(yearEntry.safReject);
      if (isNaN(acceptThresh) || isNaN(rejectThresh)) continue;

      let status = 'Waiting List (ציון פנימי)';
      if (score >= acceptThresh) status = 'Accepted (התקבל)';
      else if (score < rejectThresh) status = 'Rejected (נדחה)';

      results.push({
        track: prog.track_number,
        name: prog.track_name,
        score: score.toFixed(3),
        accept: acceptThresh,
        reject: rejectThresh,
        status: status
      });
    }

    console.log(`\nResults for HUJI (Hebrew University):`);
    console.log(`---------------------------------------------------------------------------`);
    results.forEach(r => {
      console.log(`[${r.track}] ${r.name}:`);
      console.log(`  - Computed score: ${r.score}`);
      console.log(`  - Acceptance Threshold: ${r.accept} | Rejection Threshold: ${r.reject}`);
      console.log(`  - Status: ${r.status}`);
      console.log(`---------------------------------------------------------------------------`);
    });
  } catch (error) {
    console.error('Failed to query HUJI calculator dynamically:', error.message);
  }
}

main();