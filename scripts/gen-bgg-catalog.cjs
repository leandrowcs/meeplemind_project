// Generates src/data/bggBundledCatalog.js from boardgames_ranks.csv
// Usage: node scripts/gen-bgg-catalog.js
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../src/data/boardgames_ranks.csv');
const OUT_PATH = path.join(__dirname, '../src/data/bggBundledCatalog.js');
const MAX_ITEMS = 5000;

function parseCsvLine(line) {
  const fields = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n');
// header: id,name,yearpublished,rank,bayesaverage,average,usersrated,is_expansion,...
const items = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const f = parseCsvLine(line);
  // f[0]=id, f[1]=name, f[2]=yearpublished, f[3]=rank, f[7]=is_expansion
  const id = (f[0] || '').trim();
  const name = (f[1] || '').trim();
  const yearPublished = (f[2] || '').trim();
  const rank = parseInt(f[3], 10);
  const isExpansion = (f[7] || '').trim();

  if (!id || !name || !rank || isNaN(rank)) continue;
  if (isExpansion === '1') continue;

  items.push({ id, name, yearPublished, rank });
  if (items.length >= MAX_ITEMS) break;
}

const generated = new Date().toISOString().slice(0, 10);
const js = `// Auto-generated from boardgames_ranks.csv — do not edit manually.
// Run: node scripts/gen-bgg-catalog.js to regenerate.
// Generated: ${generated} | Items: ${items.length}

export const BGG_BUNDLED_CATALOG = ${JSON.stringify(items, null, 0)};
`;

fs.writeFileSync(OUT_PATH, js, 'utf8');
console.log(`Generated ${items.length} items -> ${OUT_PATH}`);
