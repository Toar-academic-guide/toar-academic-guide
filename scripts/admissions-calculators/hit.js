// HIT (Holon Institute of Technology)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;
  let mathGrade = 85;
  let mathUnits = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
    if (args[i] === "--math-grade" && args[i + 1])
      mathGrade = parseFloat(args[i + 1]);
    if (args[i] === "--math-units" && args[i + 1])
      mathUnits = parseInt(args[i + 1]);
  }

  console.log(
    `HIT Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}, Math=${mathGrade} (${mathUnits} units)`,
  );

  const hasMathDeficit = !(
    (mathUnits === 5 && mathGrade >= 70) ||
    (mathUnits === 4 && mathGrade >= 80)
  );

  // CS Admission Logic
  const isAcceptedCS =
    bagrut > 56 && (psycho >= 550 || bagrut >= 102) && !hasMathDeficit;

  console.log("\nResults for HIT (Computer Science):");
  console.log(`- Optimization Bagrut Average: ${bagrut}`);
  console.log(`- Math Deficit: ${hasMathDeficit ? "YES" : "NO"}`);
  console.log(
    `- Direct Admission Status: ${isAcceptedCS ? "Accepted (ציון מעבר)" : "Rejected (unmet thresholds)"}`,
  );
}

main();
