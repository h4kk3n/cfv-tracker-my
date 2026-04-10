/**
 * Scrape D-Standard card data from en.cf-vanguard.com
 *
 * Strategy:
 *   1. Fetch expansion list from the card list page (filter D-/DZ- sets)
 *   2. For each expansion, paginate the text list view to get card numbers
 *   3. Fetch each card's detail page for full data (rarity, illustrator, etc.)
 *
 * Outputs:
 *   scripts/en-cards-data.json  — all card data
 *   scripts/set-lookup.json     — setId → set name mapping
 *
 * Resumable: skips cards already in en-cards-data.json
 *
 * Usage:
 *   node scripts/scrape-en-cards.mjs               (full run)
 *   node scripts/scrape-en-cards.mjs --list-only    (collect card numbers only)
 *   node scripts/scrape-en-cards.mjs --resume       (resume detail fetch)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'en-cards-data.json');
const CARD_LIST_CACHE = path.join(__dirname, 'en-card-numbers.json');
const SET_LOOKUP_FILE = path.join(__dirname, 'set-lookup.json');

const BASE = 'https://en.cf-vanguard.com';

const DELAY_LIST = 500;
const DELAY_DETAIL = 400;
const MAX_RETRIES = 3;
const SAVE_EVERY = 50;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetch(url, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 CFVTracker/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `${BASE}/cardlist/`,
      },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${BASE}${res.headers.location}`;
        return fetch(redirect, retries).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        if (retries > 0) return sleep(2000).then(() => fetch(url, retries - 1)).then(resolve).catch(reject);
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => {
      if (retries > 0) sleep(2000).then(() => fetch(url, retries - 1)).then(resolve).catch(reject);
      else reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) sleep(2000).then(() => fetch(url, retries - 1)).then(resolve).catch(reject);
      else reject(new Error(`Timeout: ${url}`));
    });
  });
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"');
}

// ─── Step 1: Discover D-Standard expansions ─────────────────────────────────

async function getExpansions() {
  console.log('Fetching expansion list...');
  const html = await fetch(`${BASE}/cardlist/`);

  const linkPattern = /expansion=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const expansions = [];
  const seen = new Set();
  let m;

  while ((m = linkPattern.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const fullText = decodeHtml(m[2].replace(/<[^>]+>/g, ' ').trim());
    const setCodeMatch = fullText.match(/\[VGE-(D[Z]?-[^\]]+)\]/);
    if (!setCodeMatch) continue;

    const setCode = setCodeMatch[1];
    if (!setCode.startsWith('D-') && !setCode.startsWith('DZ-')) continue;

    // Extract product name after the [VGE-...] bracket
    const nameMatch = fullText.match(/\]\s*(.*?)(?:\s{2,}|\n|$)/);
    const name = nameMatch ? nameMatch[1].trim() : fullText;

    expansions.push({ expansionId: id, setCode, name });
  }

  console.log(`  Found ${expansions.length} D-Standard/DZ expansions\n`);
  return expansions;
}

// ─── Step 2: Collect card numbers per expansion ─────────────────────────────

function parseCardNumbers(html) {
  const numbers = [];
  const pattern = /<div\s+class="number">\s*([\s\S]*?)\s*<\/div>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const val = m[1].trim();
    // Skip non-card-number values (like "23995 Results")
    if (val && val.match(/^[A-Z0-9]/) && val.includes('-') && !val.includes('Results')) {
      numbers.push(val);
    }
  }
  return numbers;
}

async function collectCardNumbers() {
  if (fs.existsSync(CARD_LIST_CACHE)) {
    console.log('Loading cached card number list...');
    const cached = JSON.parse(fs.readFileSync(CARD_LIST_CACHE, 'utf8'));
    console.log(`  ${cached.length} cards in cache\n`);
    return cached;
  }

  const expansions = await getExpansions();
  const allCards = [];
  const seen = new Set();
  const setLookup = {};

  console.log('=== Collecting card numbers by expansion ===\n');

  for (const exp of expansions) {
    await sleep(DELAY_LIST);

    // Fetch first page
    const firstUrl = `${BASE}/cardlist/cardsearch/?view=text&sort=no&expansion=${exp.expansionId}`;
    const firstHtml = await fetch(firstUrl);
    let numbers = parseCardNumbers(firstHtml);

    // AJAX pages
    let page = 2;
    let emptyStreak = 0;
    while (emptyStreak < 2) {
      await sleep(DELAY_LIST);
      try {
        const ajaxUrl = `${BASE}/cardlist/cardsearch_ex/?view=text&sort=no&expansion=${exp.expansionId}&page=${page}`;
        const html = await fetch(ajaxUrl);
        if (!html || html.trim().length < 30) { emptyStreak++; page++; continue; }
        const pageNums = parseCardNumbers(html);
        if (pageNums.length === 0) { emptyStreak++; page++; continue; }
        emptyStreak = 0;
        numbers = numbers.concat(pageNums);
      } catch {
        emptyStreak++;
      }
      page++;
    }

    // Deduplicate and add
    let added = 0;
    for (const cardNo of numbers) {
      if (!seen.has(cardNo)) {
        seen.add(cardNo);
        allCards.push({ cardNumber: cardNo, setCode: exp.setCode, expansionId: exp.expansionId });
        added++;
      }
    }

    // Track set name
    setLookup[exp.setCode] = exp.name;

    console.log(`  ${exp.setCode} (exp ${exp.expansionId}): ${added} cards — ${exp.name}`);
  }

  // Save set lookup
  fs.writeFileSync(SET_LOOKUP_FILE, JSON.stringify(setLookup, null, 2));
  console.log(`\nSet lookup saved to ${SET_LOOKUP_FILE}`);

  // Save card list cache
  fs.writeFileSync(CARD_LIST_CACHE, JSON.stringify(allCards, null, 2));
  console.log(`Total unique cards: ${allCards.length}`);
  console.log(`Saved to ${CARD_LIST_CACHE}\n`);

  return allCards;
}

// ─── Step 3: Fetch card detail pages ────────────────────────────────────────

function parseDetailPage(html) {
  const card = {};

  // Card name
  const nameMatch = html.match(/<span\s+class="face">([\s\S]*?)<\/span>/i);
  card.name = nameMatch ? decodeHtml(nameMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

  function field(className) {
    const re = new RegExp(`<div\\s+class="${className}"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/div>`, 'i');
    const m = html.match(re);
    if (!m) return '';
    return decodeHtml(m[1].replace(/<[^>]+>/g, '').trim());
  }

  card.cardType = field('type');
  card.nation = field('nation');
  card.race = field('race');
  card.regulation = field('regulation');
  card.rarity = field('rarity');
  card.illustrator = field('illstrator'); // Their HTML typo

  // Card number — take the D- prefixed one if multiple exist
  const numberMatches = html.match(/<div\s+class="number">\s*([\s\S]*?)\s*<\/div>/gi);
  card.cardNumber = '';
  if (numberMatches) {
    for (const nm of numberMatches) {
      const val = nm.replace(/<[^>]*>/g, '').trim();
      if (val.startsWith('D') && val.includes('/')) {
        card.cardNumber = val;
        break;
      }
    }
    if (!card.cardNumber && numberMatches.length > 0) {
      card.cardNumber = numberMatches[0].replace(/<[^>]*>/g, '').trim();
    }
  }

  // Numeric fields
  card.grade = parseInt(field('grade').match(/(\d+)/)?.[1]) || 0;
  card.power = parseInt(field('power').match(/(\d+)/)?.[1]) || 0;
  card.critical = parseInt(field('critical').match(/(\d+)/)?.[1]) || 1;
  const shieldVal = field('shield').match(/(\d+)/);
  card.shield = shieldVal ? parseInt(shieldVal[1]) : null;

  card.skill = field('skill');
  if (card.skill === '-') card.skill = '';

  card.gift = field('gift');
  if (card.gift === '-') card.gift = '';

  // Effect text
  const effectMatch = html.match(/<div\s+class="effect"[^>]*>([\s\S]*?)<\/div>/i);
  card.effect = effectMatch
    ? decodeHtml(effectMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
        .replace(/<[^>]+>/g, '').trim())
    : '';

  // Flavor text
  const flavorMatch = html.match(/<div\s+class="flavor"[^>]*>([\s\S]*?)<\/div>/i);
  card.flavor = flavorMatch
    ? decodeHtml(flavorMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim())
    : '';

  // Set name from "Found in the following Products" table
  const productMatch = html.match(/Found in the following Products[\s\S]*?<table>([\s\S]*?)<\/table>/i);
  card.setName = '';
  if (productMatch) {
    const tdPattern = /<td>\s*([\s\S]*?)\s*<\/td>/gi;
    const tds = [];
    let tdm;
    while ((tdm = tdPattern.exec(productMatch[1])) !== null) {
      tds.push(tdm[1].replace(/<[^>]+>/g, '').trim());
    }
    // 2nd <td> is the set name (1st is date)
    if (tds.length >= 2 && tds[1]) {
      card.setName = decodeHtml(tds[1]);
    }
  }

  // Derive setId from card number
  if (card.cardNumber) {
    const setMatch = card.cardNumber.match(/^(D[Z]?-[A-Za-z]+\d+)/);
    card.setId = setMatch ? setMatch[1] : '';
  } else {
    card.setId = '';
  }

  return card;
}

async function fetchCardDetails(cardList) {
  console.log('=== Fetching card detail pages ===\n');

  // Load existing for resume
  const existing = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    for (const card of data) {
      if (card.cardNumber) existing[card.cardNumber] = card;
    }
    console.log(`Loaded ${Object.keys(existing).length} existing cards (resume mode)\n`);
  }

  const results = [];
  let fetched = 0;
  let skipped = 0;
  let errors = 0;
  const total = cardList.length;

  for (let i = 0; i < total; i++) {
    const { cardNumber } = cardList[i];

    if (existing[cardNumber]) {
      results.push(existing[cardNumber]);
      skipped++;
      continue;
    }

    await sleep(DELAY_DETAIL);

    try {
      const html = await fetch(`${BASE}/cardlist/?cardno=${encodeURIComponent(cardNumber)}`);
      const card = parseDetailPage(html);
      if (!card.cardNumber) card.cardNumber = cardNumber;

      // Fill setCode from list data if not derived
      if (!card.setId && cardList[i].setCode) {
        card.setId = cardList[i].setCode;
      }

      results.push(card);
      existing[card.cardNumber] = card;
      fetched++;

      if (fetched % SAVE_EVERY === 0) {
        const pct = ((i + 1) / total * 100).toFixed(1);
        console.log(`  [${pct}%] ${fetched} fetched, ${skipped} cached, ${errors} errors — ${card.cardNumber} ${card.name}`);
        saveResults(results);
      }
    } catch (err) {
      console.error(`  Error ${cardNumber}: ${err.message}`);
      errors++;
    }
  }

  saveResults(results);
  printSummary(results, total, fetched, skipped, errors);
  return results;
}

function saveResults(results) {
  const sorted = results
    .filter(c => c.cardNumber)
    .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2));
}

function printSummary(results, total, fetched, skipped, errors) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Total cards: ${total}`);
  console.log(`  Fetched: ${fetched}`);
  console.log(`  Cached: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Saved to ${OUTPUT_FILE}`);
  console.log(`${'═'.repeat(50)}`);

  const sets = {}, rarities = {}, nations = {};
  for (const c of results) {
    sets[c.setId || '?'] = (sets[c.setId || '?'] || 0) + 1;
    rarities[c.rarity || '?'] = (rarities[c.rarity || '?'] || 0) + 1;
    nations[c.nation || '?'] = (nations[c.nation || '?'] || 0) + 1;
  }

  console.log('\nBy set:');
  Object.entries(sets).sort().forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log('\nBy rarity:');
  Object.entries(rarities).sort().forEach(([r, n]) => console.log(`  ${r}: ${n}`));
  console.log('\nBy nation:');
  Object.entries(nations).sort().forEach(([n, c]) => console.log(`  ${n}: ${c}`));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list-only');

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CFV Tracker — EN Card Data Scraper              ║');
  console.log('║  Source: en.cf-vanguard.com                      ║');
  console.log('║  Filter: D-Standard / overDress / DivineZ only   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const cardList = await collectCardNumbers();

  if (listOnly) {
    console.log('--list-only: skipping detail fetch');
    return;
  }

  await fetchCardDetails(cardList);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
