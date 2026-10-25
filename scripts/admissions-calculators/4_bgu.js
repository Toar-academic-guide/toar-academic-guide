// אוניברסיטת בן-גוריון בנגב (Ben-Gurion University)
async function main() {
  const args = process.argv.slice(2);
  let bagrut = 105.5;
  let psycho = 680;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bagrut' && args[i+1]) bagrut = parseFloat(args[i+1]);
    if (args[i] === '--psycho' && args[i+1]) psycho = parseFloat(args[i+1]);
  }

  console.log(`BGU Calculator Query: Bagrut=${bagrut}, Psychometric=${psycho}`);

  console.log('not found: no published bagrut conversion');
}

main();
