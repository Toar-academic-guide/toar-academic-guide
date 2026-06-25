const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'admissions-calculators');

async function main() {
  const args = process.argv.slice(2);
  const query = args.join(' ').trim().toLowerCase();

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory not found at ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.js')).sort((a, b) => {
    const aNum = parseInt(a.split('_')[0]) || 9999;
    const bNum = parseInt(b.split('_')[0]) || 9999;
    return aNum - bNum;
  });

  if (!query) {
    console.log('=== Toar Academic Guide - Admissions Data CLI ===');
    console.log('Usage:');
    console.log('  node scripts/query-admissions.js <index_number_or_name_keyword>');
    console.log('\nExamples:');
    console.log('  node scripts/query-admissions.js 112');
    console.log('  node scripts/query-admissions.js "בית ברל"');
    console.log('  node scripts/query-admissions.js huji');
    console.log('\nAvailable Institutions:');
    files.forEach(f => {
      const displayName = f.replace('.js', '').replace(/_/g, ' ');
      console.log(`  - ${displayName}`);
    });
    return;
  }

  // Find matching file
  const matchedFile = files.find(f => {
    const cleanF = f.toLowerCase();
    if (cleanF.startsWith(query + '_') || cleanF.replace('.js', '') === query) return true;
    return cleanF.includes(query);
  });

  if (!matchedFile) {
    console.error(`No script found matching query: "${query}"`);
    console.log('Run without arguments to list all available institutions.');
    process.exit(1);
  }

  const filePath = path.join(targetDir, matchedFile);
  console.log(`Executing crawler script: ${matchedFile}...\n`);

  try {
    const script = require(filePath);
    if (typeof script.main === 'function') {
      await script.main();
    } else {
      const exec = require('child_process').execSync;
      const output = exec(`node "${filePath}"`, { encoding: 'utf8' });
      console.log(output);
    }
  } catch (err) {
    console.error('Error running script:', err.message);
  }
}

main().catch(console.error);
