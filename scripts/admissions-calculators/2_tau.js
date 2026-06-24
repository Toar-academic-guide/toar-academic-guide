// אוניברסיטת תל אביב (Tel Aviv University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.5;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
  }

  console.log(`TAU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  try {
    const response = await fetch("https://go.tau.ac.il/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationName: "getLastScore",
        variables: {
          scoresData: {
            prog: "calctziun",
            out: "json",
            reali10: 0,
            psicho: String(psycho),
            bagrut: String(bagrut),
          },
        },
        query:
          "query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }",
      }),
    });

    const result = await response.json();
    const bodyStr = result.data.getLastScore.body;
    const scores = JSON.parse(bodyStr);

    console.log("\nResults for Tel Aviv University:");
    console.log(`- General Hatama (סכם כללי): ${scores.hatama}`);
    console.log(`- Engineering Hatama (סכם הנדסה): ${scores.hatama_handasa}`);
    console.log(
      `- Exact Sciences Hatama (סכם מדעים מדויקים): ${scores.hatama_meduyakim}`,
    );
    console.log(`- Medicine Hatama (סכם רפואה): ${scores.hatama_refua}`);
    console.log(`- Management Hatama (סכם ניהול): ${scores.hatama_nihul}`);
  } catch (error) {
    console.error("Failed to query TAU calculator API:", error.message);
  }
}

main();
