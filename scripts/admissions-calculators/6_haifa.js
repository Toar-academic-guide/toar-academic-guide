// אוניברסיטת חיפה (University of Haifa)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.0;
  let psycho = 680;
  let math = 120;
  let english = 120;
  let verbal = 120;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bagrut" && args[i + 1]) bagrut = parseFloat(args[i + 1]);
    if (args[i] === "--psycho" && args[i + 1]) psycho = parseFloat(args[i + 1]);
    if (args[i] === "--math" && args[i + 1]) math = parseFloat(args[i + 1]);
    if (args[i] === "--english" && args[i + 1])
      english = parseFloat(args[i + 1]);
    if (args[i] === "--verbal" && args[i + 1]) verbal = parseFloat(args[i + 1]);
  }

  if (psycho !== 680 && math === 120 && english === 120 && verbal === 120) {
    const share = Math.round(psycho / 5);
    math = share;
    verbal = share * 2;
    english = share * 2;
  }

  console.log(
    `Haifa Calculator Query: Bagrut=${bagrut}, Psychometric Subscores (Math=${math}, English=${english}, Verbal=${verbal})`,
  );

  try {
    const connRes = await fetch(
      "https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=checkConnection",
      {
        headers: {
          "x-requested-with": "XMLHttpRequest",
          referer:
            "https://applicants.haifa.ac.il/enrollmentChances/index.html",
        },
      },
    );
    const connData = await connRes.json();
    const guid = connData.data.guid;

    const params = new URLSearchParams({
      operation: "calculateChances",
      year: "2026",
      semester: "001",
      hug: "SC0001",
      program: "52258372",
      bag_year: "2020",
      bag_type: "001",
      bag_avg: bagrut.toFixed(1),
      psy_year: "2021",
      psy_math: String(math),
      psy_english: String(english),
      psy_verbal: String(verbal),
    }).toString();

    const chancesRes = await fetch(
      `https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?${params}`,
      {
        headers: {
          "x-requested-with": "XMLHttpRequest",
          referer:
            "https://applicants.haifa.ac.il/enrollmentChances/index.html",
        },
      },
    );
    const chancesData = await chancesRes.json();

    console.log(
      "\nResults for University of Haifa (SC0001 - Computer Science):",
    );
    if (chancesData && chancesData.data && chancesData.data[0]) {
      const items = chancesData.data[0].results[0].content;
      items.forEach((item) => {
        console.log(`- ${item.label}: ${item.value}`);
      });
    } else {
      console.log("Unable to calculate score via API.");
    }
  } catch (error) {
    console.error("Failed to query Haifa calculator API:", error.message);
  }
}

main();
