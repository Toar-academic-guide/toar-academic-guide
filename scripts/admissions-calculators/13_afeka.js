// אפקה - המכללה האקדמית להנדסה (Afeka College of Engineering)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let mathGrade = 85;
  let mathUnits = 5;
  let englishGrade = 85;
  let englishUnits = 5;
  let physicsGrade = 0;
  let physicsUnits = 0;
  let csGrade = 0;
  let csUnits = 0;
  let psycho = 550;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--math-grade" && args[i + 1])
      mathGrade = parseFloat(args[i + 1]);
    if (args[i] === "--math-units" && args[i + 1])
      mathUnits = parseInt(args[i + 1]);
    if (args[i] === "--english-grade" && args[i + 1])
      englishGrade = parseFloat(args[i + 1]);
    if (args[i] === "--english-units" && args[i + 1])
      englishUnits = parseInt(args[i + 1]);
    if (args[i] === "--physics-grade" && args[i + 1])
      physicsGrade = parseFloat(args[i + 1]);
    if (args[i] === "--physics-units" && args[i + 1])
      physicsUnits = parseInt(args[i + 1]);
    if (args[i] === "--cs-grade" && args[i + 1])
      csGrade = parseFloat(args[i + 1]);
    if (args[i] === "--cs-units" && args[i + 1])
      csUnits = parseInt(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  // Formula:
  // Sekhem = 0.2 * BagrutAvg + (3 * MathGrade * MathUnits + EnglishGrade * EnglishUnits + PhysicsGrade * PhysicsUnits + CSGrade * CSUnits) / 24 + 160
  const term1 = 0.2 * bagrut;
  const term2 =
    (3 * mathGrade * mathUnits +
      englishGrade * englishUnits +
      physicsGrade * physicsUnits +
      csGrade * csUnits) /
    24;
  const sekhem = Math.floor(term1 + term2 + 160);

  // Checks
  const hasMathThreshold =
    (mathUnits === 5 && mathGrade >= 70) ||
    (mathUnits === 4 && mathGrade >= 80);
  const hasEnglishThreshold = englishGrade >= 60;
  const hasPsychoThreshold = psycho >= 550;

  let status = "Accepted";
  const deficits = [];
  if (!hasMathThreshold)
    deficits.push(
      "Math requirement not met (Requires 5 units >= 70 or 4 units >= 80)",
    );
  if (!hasEnglishThreshold)
    deficits.push("English requirement not met (Requires >= 60)");
  if (!hasPsychoThreshold)
    deficits.push(
      "Psychometric gate not met (Requires >= 550 for direct CS/Engineering admission)",
    );

  if (deficits.length > 0) {
    status = `Rejected due to unmet thresholds:\n  ${deficits.join("\n  ")}`;
  }

  console.log(
    "Results for Afeka College of Engineering (B.Sc. Software Engineering):",
  );
  console.log(`- Calculated Sekhem: ${sekhem}`);
  console.log(`- Admission Status: ${status}`);
}

main();
