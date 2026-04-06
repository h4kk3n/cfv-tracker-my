/**
 * Fetch all Cardfight Vanguard D-Standard cards from vanguardcard.io API
 * and Cardfight Fandom Wiki for Japanese names.
 *
 * Usage: node scripts/fetch-cards.mjs
 * Output: scripts/cards-output.json (ready for Firebase import)
 */

import https from 'https';
import fs from 'fs';

const NATIONS = [
  'Dragon Empire', 'Keter Sanctuary', 'Dark States',
  'Brandt Gate', 'Stoicheia', 'Lyrical Monasterio'
];
const GRADES = [0, 1, 2, 3, 4];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'CFVTracker/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        else resolve(data);
      });
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Fetch cards from vanguardcard.io
async function fetchFromVanguardCardIO() {
  const allCards = [];
  const seen = new Set();

  for (const nation of NATIONS) {
    for (const grade of GRADES) {
      const url = `https://vanguardcard.io/api/search.php?limit=500&format=D&nation=${encodeURIComponent(nation)}&grade=${grade}`;
      console.log(`Fetching: ${nation} Grade ${grade}...`);
      try {
        const raw = await fetch(url);
        const cards = JSON.parse(raw);
        if (Array.isArray(cards)) {
          for (const card of cards) {
            const key = card.name + '_' + (card.card_sets || '');
            if (!seen.has(key)) {
              seen.add(key);
              allCards.push(card);
            }
          }
          console.log(`  Got ${cards.length} cards (total unique: ${allCards.length})`);
        }
      } catch (err) {
        console.error(`  Error: ${err.message}`);
      }
      await sleep(500); // Be polite
    }
  }

  return allCards;
}

// Fetch Japanese name from Fandom Wiki
async function fetchJapaneseName(englishName) {
  const pageName = englishName.replace(/ /g, '_');
  const url = `https://cardfight.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&format=json&prop=wikitext`;
  try {
    const raw = await fetch(url);
    const data = JSON.parse(raw);
    if (data.parse && data.parse.wikitext) {
      const wt = data.parse.wikitext['*'] || '';
      const kanji = wt.match(/\|kanji\s*=\s*(.+)/)?.[1]?.trim() || '';
      const kana = wt.match(/\|kana\s*=\s*(.+)/)?.[1]?.trim() || '';
      const phonetic = wt.match(/\|phonetic\s*=\s*(.+)/)?.[1]?.trim() || '';
      const jpEffect = wt.match(/\|jpeffect\s*=\s*([\s\S]*?)(?=\n\|)/)?.[1]?.trim() || '';
      return { kanji, kana, phonetic, jpEffect };
    }
  } catch {}
  return { kanji: '', kana: '', phonetic: '', jpEffect: '' };
}

// Convert to our app's Card format
function convertCard(raw, jpData) {
  const sets = raw.card_sets;
  const cardNumber = Array.isArray(sets) ? (sets[0] || '') : (typeof sets === 'string' ? sets.split(',')[0].trim() : '');
  const trigger = raw.card_trigger || null;
  const rarity = ''; // Not available from this API

  return {
    cardNumber,
    nameEN: raw.name || '',
    nameJP: jpData.kanji || '',
    nameRomaji: jpData.phonetic || '',
    nation: raw.nation || '',
    clan: raw.clan || '',
    race: raw.race || '',
    grade: parseInt(raw.grade) || 0,
    power: parseInt(raw.power) || 0,
    shield: raw.shield ? parseInt(raw.shield) : null,
    critical: parseInt(raw.critical) || 1,
    trigger: trigger || null,
    skillIcon: raw.skillicon || null,
    format: ['Standard'],
    setId: cardNumber.split('/')[0] || '',
    setName: raw.series || '',
    rarity,
    effectEN: (raw.effect || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
    effectJP: jpData.jpEffect || '',
    flavorTextEN: raw.flavor || '',
    flavorTextJP: '',
    imageURL: raw.image_url || '',
    errata: [],
  };
}

async function main() {
  console.log('=== Fetching D-Standard cards from vanguardcard.io ===\n');
  const rawCards = await fetchFromVanguardCardIO();
  console.log(`\nTotal unique cards fetched: ${rawCards.length}\n`);

  console.log('=== Fetching Japanese names from Fandom Wiki ===\n');
  const cards = [];
  let jpCount = 0;

  for (let i = 0; i < rawCards.length; i++) {
    const raw = rawCards[i];
    if (i % 50 === 0) console.log(`Processing ${i + 1}/${rawCards.length}...`);

    let jpData = { kanji: '', kana: '', phonetic: '', jpEffect: '' };
    // Only fetch JP for first 200 to avoid rate limiting, rest can be done in batches
    if (i < 200) {
      jpData = await fetchJapaneseName(raw.name);
      if (jpData.kanji) jpCount++;
      await sleep(200);
    }

    cards.push(convertCard(raw, jpData));
  }

  console.log(`\nJapanese names found: ${jpCount}/${Math.min(rawCards.length, 200)}`);

  // Save output
  const outputPath = new URL('./cards-output.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2));
  console.log(`\nSaved ${cards.length} cards to scripts/cards-output.json`);
  console.log('You can import this file via the Admin panel > Import JSON');
}

main().catch(console.error);
