/**
 * Parse Cardfight Area text files into JSON for Firebase import.
 * Merges with official EN card data (from en.cf-vanguard.com scraper)
 * to fill in: cardNumber, rarity, illustrator, setId, setName, cardType, flavor.
 *
 * Images reference GitHub raw URLs directly — no downloads needed.
 *
 * Usage: node scripts/parse-cfa-cards.mjs
 * Output: scripts/cards-output.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFA_DIR = path.join(__dirname, '..', 'Cardfight!! Area Full Version 4.16', 'Text');
const IMAGE_BASE = 'https://raw.githubusercontent.com/uniquekid/cfa-texts/master/CardSprite';
const THUMB_BASE = 'https://raw.githubusercontent.com/uniquekid/cfa-texts/master/CardSpriteMini2';

const EN_DATA_FILE = path.join(__dirname, 'en-cards-data.json');
const SET_LOOKUP_FILE = path.join(__dirname, 'set-lookup.json');

// D-Standard nation files
const NATION_FILES = [
  'Dragon Empire.txt',
  'Keter Sanctuary.txt',
  'Dark States.txt',
  'Brandt Gate.txt',
  'Stoicheia.txt',
  'Lyrical Monasterio.txt',
];

// Collab / title booster nation files (D-Standard legal)
const COLLAB_FILES = [
  'Touken Ranbu.txt',
  'Shaman King.txt',
  'Record of Ragnarok.txt',
  'Buddyfight.txt',
  'Monster Strike.txt',
  'Bang Dream.txt',
  'Corocoro.txt',
  'VSPO.txt',
];

// Also parse Order Cards (they belong to D-Standard too)
const EXTRA_FILES = ['Order Cards.txt'];

// ─── Load EN data for merge ─────────────────────────────────────────────────

function loadEnData() {
  if (!fs.existsSync(EN_DATA_FILE)) {
    console.log('  No EN data file found — run scrape-en-cards.mjs first');
    console.log('  Continuing without merge...\n');
    return null;
  }

  const data = JSON.parse(fs.readFileSync(EN_DATA_FILE, 'utf8'));
  console.log(`  Loaded ${data.length} cards from EN data`);

  // Build name-based lookup (normalized lowercase, trimmed)
  const byName = new Map();
  for (const card of data) {
    if (card.name) {
      const key = normalizeName(card.name);
      // If multiple entries for same name, prefer the one with more data
      if (!byName.has(key) || (card.rarity && !byName.get(key).rarity)) {
        byName.set(key, card);
      }
    }
  }

  console.log(`  Built name lookup: ${byName.size} unique names\n`);
  return byName;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`\u2018\u2019\u0092]/g, "'")  // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadSetLookup() {
  if (!fs.existsSync(SET_LOOKUP_FILE)) return {};
  return JSON.parse(fs.readFileSync(SET_LOOKUP_FILE, 'utf8'));
}

// Normalize nation names — V-era clans map to D-Standard nations, fix casing
const NATION_NORMALIZE = {
  // V-era clan → D-Standard nation
  'united sanctuary': 'Keter Sanctuary',
  'royal paladin': 'Keter Sanctuary',
  'oracle think tank': 'Keter Sanctuary',
  'shadow paladin': 'Keter Sanctuary',
  'genesis': 'Keter Sanctuary',
  'gold paladin': 'Keter Sanctuary',
  'angel feather': 'Keter Sanctuary',
  'dark zone': 'Dark States',
  'dark irregulars': 'Dark States',
  'pale moon': 'Dark States',
  'spike brothers': 'Dark States',
  'gear chronicle': 'Dark States',
  'star gate': 'Brandt Gate',
  'nova grappler': 'Brandt Gate',
  'dimension police': 'Brandt Gate',
  'link joker': 'Brandt Gate',
  'magallanica': 'Stoicheia',
  'aqua force': 'Stoicheia',
  'bermuda triangle': 'Stoicheia',
  'granblue': 'Stoicheia',
  'neo nectar': 'Stoicheia',
  'great nature': 'Stoicheia',
  'megacolony': 'Stoicheia',
  'zoo': 'Stoicheia',
  'dragon empire': 'Dragon Empire',
  'kagero': 'Dragon Empire',
  'narukami': 'Dragon Empire',
  'nubatama': 'Dragon Empire',
  'murakumo': 'Dragon Empire',
  'tachikaze': 'Dragon Empire',
  // Casing fixes for collab nations
  'bang dream': 'BanG Dream!',
  'bang dream!': 'BanG Dream!',
  'corocoro': 'CoroCoro',
  'shaman king': 'SHAMAN KING',
  'vspo': 'VSPO',
  'monster strike': 'Monster Strike',
};

function normalizeNation(nation) {
  if (!nation) return '';
  const key = nation.toLowerCase().trim();
  return NATION_NORMALIZE[key] || nation;
}

// ─── CFA Parser ─────────────────────────────────────────────────────────────

function parseCardFile(filePath, defaultNation) {
  const raw = fs.readFileSync(filePath, 'latin1');
  const cards = [];

  // Split into card blocks — each starts with "CardStat = XXXX"
  const blocks = raw.split(/(?=CardStat\s*=\s*\d+)/);

  for (const block of blocks) {
    const idMatch = block.match(/CardStat\s*=\s*(\d+)/);
    if (!idMatch) continue;
    const cardId = parseInt(idMatch[1]);

    // Extract CardName
    const nameMatch = block.match(/global\.CardName\[CardStat\]\s*=\s*'([^']*(?:\\'[^']*)*)'/);
    if (!nameMatch) continue;
    const nameEN = nameMatch[1].replace(/\\'/g, "'").replace(/\x92/g, "'").trim();
    if (!nameEN) continue;

    // Extract CardText (contains nation/race on first line, then effect)
    const textMatch = block.match(/global\.CardText\[CardStat\]\s*=\s*'([\s\S]*?)(?:'\s*$|'\s*\n)/m);
    let nation = defaultNation;
    let race = '';
    let effectEN = '';

    if (textMatch) {
      const fullText = textMatch[1].replace(/\x92/g, "'").replace(/\\'/g, "'");
      const lines = fullText.split('\n');

      // First line is "Nation/Race" or "Nation/Race1/Race2"
      if (lines[0]) {
        const parts = lines[0].split('/').map(s => s.trim());
        if (parts.length >= 1 && parts[0]) {
          const knownNations = ['Dragon Empire', 'Keter Sanctuary', 'Dark States', 'Brandt Gate', 'Stoicheia', 'Lyrical Monasterio'];
          if (knownNations.some(n => parts[0].includes(n))) {
            nation = parts[0];
            race = parts.slice(1).join('/');
          } else {
            race = parts.join('/');
          }
        }
      }

      // Rest is effect text
      const effectLines = lines.slice(1);
      effectEN = effectLines.join('\n').trim();
    }

    // Extract grade
    const gradeMatch = block.match(/global\.UnitGrade\[CardStat\]\s*=\s*(\d+)/);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;

    // Extract power
    const powerMatch = block.match(/global\.PowerStat\[CardStat\]\s*=\s*(\d+)/);
    const power = powerMatch ? parseInt(powerMatch[1]) : 0;

    // Extract shield
    const shieldMatch = block.match(/global\.DefensePowerStat\[CardStat\]\s*=\s*(\d+)/);
    const shield = shieldMatch ? parseInt(shieldMatch[1]) : null;

    // Extract PersonaRide flag
    const personaRide = block.includes('global.PersonaRide[CardStat]');

    // Extract trigger info
    const triggerMatch = block.match(/global\.TriggerUnit\[CardStat\]\s*=\s*(\d+)/);
    let trigger = null;
    if (triggerMatch) {
      const triggerCode = parseInt(triggerMatch[1]);
      const triggerMap = { 1: 'Critical', 2: 'Draw', 3: 'Stand', 4: 'Heal', 5: 'Front', 6: 'Over' };
      trigger = triggerMap[triggerCode] || null;
    }
    if (!trigger && effectEN) {
      if (effectEN.includes('[Power]+10000/[Critical]+1')) trigger = 'Critical';
      else if (effectEN.includes('[Power]+10000') && effectEN.includes('draw a card')) trigger = 'Draw';
      else if (effectEN.includes('[Power]+10000') && effectEN.includes('Stand')) trigger = 'Stand';
      else if (effectEN.includes('[Power]+10000') && effectEN.includes('heal')) trigger = 'Heal';
      else if (effectEN.includes('front row units get [Power]+10000')) trigger = 'Front';
      else if (effectEN.includes('over trigger')) trigger = 'Over';
    }

    // Extract DCards (nation code for D-format)
    const dCardsMatch = block.match(/global\.DCards\[CardStat\]\s*=\s*(\d+)/);
    const isDFormat = dCardsMatch !== null;

    // Skill icon from PersonaRide and grade
    let skillIcon = null;
    if (grade >= 3 && personaRide) skillIcon = 'Twin Drive, Persona Ride';
    else if (grade >= 3) skillIcon = 'Twin Drive';
    else if (grade >= 1) skillIcon = 'Boost';

    // Determine card type from CFA data
    let cardType = 'Normal Unit';
    if (trigger) cardType = 'Trigger Unit';
    // Order cards don't have race typically and come from Order Cards.txt
    if (defaultNation === '' && !race) cardType = 'Normal Order';

    // Build image URL from card ID
    const imageURL = `${IMAGE_BASE}/n${cardId}.jpg`;

    cards.push({
      cfaId: cardId,
      cardNumber: `CFA-${cardId}`,
      nameEN,
      nameJP: '',
      nameRomaji: '',
      nation,
      clan: '',
      race,
      grade,
      power,
      shield: shield || null,
      critical: trigger === 'Critical' ? 2 : 1,
      trigger,
      skillIcon,
      cardType,
      format: ['Standard'],
      setId: '',
      setName: '',
      rarity: '',
      illustrator: '',
      effectEN,
      effectJP: '',
      flavorTextEN: '',
      flavorTextJP: '',
      imageURL,
      errata: [],
      isDFormat,
    });
  }

  return cards;
}

// ─── Merge CFA card with EN data ────────────────────────────────────────────

function mergeWithEnData(card, enLookup, setLookup) {
  if (!enLookup) return;

  const key = normalizeName(card.nameEN);
  const en = enLookup.get(key);
  if (!en) return;

  // Card number (real official number like D-BT01/001EN)
  if (en.cardNumber) card.cardNumber = en.cardNumber;

  // Set info
  if (en.setId) card.setId = en.setId;
  if (en.setName) {
    card.setName = en.setName;
  } else if (en.setId && setLookup[en.setId]) {
    card.setName = setLookup[en.setId];
  }

  // Collection data
  if (en.rarity) card.rarity = en.rarity;
  if (en.illustrator) card.illustrator = en.illustrator;

  // Card type from official source is more accurate
  if (en.cardType) card.cardType = en.cardType;

  // Flavor text (CFA doesn't have it)
  if (en.flavor) card.flavorTextEN = en.flavor;

  // Nation from official source (more accurate for order/collab cards)
  if (en.nation) card.nation = en.nation;

  // Normalize nation name
  card.nation = normalizeNation(card.nation);

  // Skill icon from official source
  if (en.skill) card.skillIcon = en.skill;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('=== CFA Card Parser + EN Merge ===\n');

  // Load EN data for merge
  console.log('Loading EN data...');
  const enLookup = loadEnData();
  const setLookup = loadSetLookup();

  const allCards = [];
  const seen = new Set();

  // Parse nation files + collab files
  for (const fileName of [...NATION_FILES, ...COLLAB_FILES, ...EXTRA_FILES]) {
    const filePath = path.join(CFA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${fileName} — file not found`);
      continue;
    }
    const defaultNation = fileName.replace('.txt', '');
    // Collab files use their series name as nation (will be overwritten by EN data if available)
    const nation = defaultNation === 'Order Cards' ? '' : defaultNation;
    const cards = parseCardFile(filePath, nation);

    // Only keep D-format cards
    const dCards = cards.filter(c => c.isDFormat);

    let added = 0;
    let merged = 0;
    for (const card of dCards) {
      const key = card.nameEN.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Merge with EN data
      mergeWithEnData(card, enLookup, setLookup);
      if (card.cardNumber !== `CFA-${card.cfaId}`) merged++;

      // Normalize nation for unmerged cards too
      card.nation = normalizeNation(card.nation);

      // Remove internal fields before export
      delete card.isDFormat;
      delete card.cfaId;
      allCards.push(card);
      added++;
    }
    console.log(`${fileName}: ${cards.length} total, ${dCards.length} D-format, ${added} unique, ${merged} merged`);
  }

  // Sort by nation then grade
  allCards.sort((a, b) => {
    if (a.nation !== b.nation) return a.nation.localeCompare(b.nation);
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.nameEN.localeCompare(b.nameEN);
  });

  const outputPath = path.join(__dirname, 'cards-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(allCards, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total unique D-Standard cards: ${allCards.length}`);
  console.log(`With effects: ${allCards.filter(c => c.effectEN).length}`);
  console.log(`With images: ${allCards.filter(c => c.imageURL).length}`);
  console.log(`With real card numbers: ${allCards.filter(c => !c.cardNumber.startsWith('CFA-')).length}`);
  console.log(`With rarity: ${allCards.filter(c => c.rarity).length}`);
  console.log(`With illustrator: ${allCards.filter(c => c.illustrator).length}`);
  console.log(`With set name: ${allCards.filter(c => c.setName).length}`);
  console.log(`With flavor text: ${allCards.filter(c => c.flavorTextEN).length}`);

  // Nation breakdown
  const nations = {};
  allCards.forEach(c => { nations[c.nation || 'Unknown'] = (nations[c.nation || 'Unknown'] || 0) + 1; });
  console.log('\nBy nation:');
  Object.entries(nations).sort().forEach(([n, count]) => console.log(`  ${n}: ${count}`));

  // Rarity breakdown
  const rarities = {};
  allCards.forEach(c => { rarities[c.rarity || 'None'] = (rarities[c.rarity || 'None'] || 0) + 1; });
  console.log('\nBy rarity:');
  Object.entries(rarities).sort().forEach(([r, count]) => console.log(`  ${r}: ${count}`));

  // Set breakdown
  const sets = {};
  allCards.forEach(c => { sets[c.setId || 'None'] = (sets[c.setId || 'None'] || 0) + 1; });
  console.log('\nBy set:');
  Object.entries(sets).sort().forEach(([s, count]) => console.log(`  ${s}: ${count}`));

  console.log(`\nSaved to scripts/cards-output.json`);
  console.log('Import via Admin > Import JSON > Choose File');
}

main();
