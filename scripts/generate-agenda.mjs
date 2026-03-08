#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../public/data/agenda.json');

// Maps broadcast channel names (from futbolenlatv) → acestream channel name search patterns.
// Keys are normalized (lowercased, trimmed). Values are arrays of substrings to match
// against acestream channel names (case-insensitive).
// Channels mapped to [] have no acestream source and will show as non-clickable.
const CHANNEL_MAP = {
  'dazn': ['DAZN 1', 'DAZN 2', 'DAZN 3', 'DAZN 4'],
  'dazn 1': ['DAZN 1'],
  'dazn 2': ['DAZN 2'],
  'dazn 3': ['DAZN 3'],
  'dazn 4': ['DAZN 4'],
  'dazn f1': ['DAZN F1'],
  'dazn app gratis': [],
  'm+ laliga': ['LaLiga', 'M+ LaLiga', 'Movistar LaLiga'],
  'm+ laliga 2': ['LaLiga 2', 'M+ LaLiga 2'],
  'm+ laliga hdr': ['LaLiga', 'M+ LaLiga'],
  'm+ laliga hdr 2': ['LaLiga 2', 'M+ LaLiga 2'],
  'm+ liga de campeones': ['Liga de Campeones', 'M+ Liga de Campeones', 'Champions'],
  'm+ liga de campeones hdr': ['Liga de Campeones', 'M+ Liga de Campeones', 'Champions'],
  'm+ deportes': ['M+ Deportes', 'Movistar Deportes'],
  'm+ deportes 2': ['M+ Deportes 2', 'Movistar Deportes 2'],
  'movistar plus+': ['Movistar Plus'],
  'm+ vamos': ['Vamos'],
  'gol play': ['Gol Play', 'Gol'],
  'eurosport 1': ['Eurosport 1', 'Eurosport'],
  'eurosport 2': ['Eurosport 2'],
  'teledeporte': ['Teledeporte', 'TDP'],
  'la 1': ['La 1', 'TVE'],
  'la 2': ['La 2'],
  'tv3': ['TV3'],
  'etb 1': ['ETB'],
  'mega': ['Mega'],
  'laligatv bar': [],
  'laliga tv bar': [],
  'hellotickets': [],
  'rtve play': [],
  'fifa+': [],
};

// Channels to exclude from output (ticket sales, free apps, etc.)
const EXCLUDE_CHANNELS = new Set([
  'hellotickets', 'rtve play', 'fifa+', 'laliga tv bar', 'laligatv bar',
  'laliga+ plus', 'movistar plus+: ver partido',
  'laliga tv hypermotion: ver partido', 'laliga tv hypermotion 2: ver partido',
]);

// Competition slugs we care about (from futbolenlatv URL paths).
// null = include all. Set to an array to filter.
const INCLUDE_COMPETITIONS = null;

// Strip channel descriptor suffixes like "(M54 O110)", "(Ver en directo)", "(Ver gratis)"
function cleanChannelName(raw) {
  return raw
    .replace(/\s*\((?:M\d+|O\d+|Ver[^)]*|Comprar[^)]*)[^)]*\)/gi, '')
    .replace(/\s*\(M\d+\s+O\d+\)/g, '')
    .trim();
}

// Normalize for CHANNEL_MAP lookup
function normalizeChannel(name) {
  return name.toLowerCase().trim();
}

// Decode HTML entities (&#225; → á, &#233; → é, etc.)
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&eacute;/g, 'é')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú');
}

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseEvents(html) {
  const events = [];

  // Find all table rows
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let isToday = false;
  let match;

  while ((match = rowRe.exec(html)) !== null) {
    const rowHTML = match[0];
    const inner = match[1];

    // Check for header rows (date separators)
    if (/cabeceraTabla/.test(rowHTML)) {
      isToday = /hoy/i.test(inner);
      continue;
    }

    if (!isToday) continue;

    // Extract time
    const timeMatch = inner.match(/<td\s+class="hora[^"]*">\s*([\d:]+)\s*<\/td>/);
    if (!timeMatch) continue;
    const time = timeMatch[1];

    // Extract competition from schema.org URL
    const compUrlMatch = inner.match(/<meta\s+itemprop="url"\s+content="[^"]*\/competicion\/([^"]+)"/);
    const compSlug = compUrlMatch ? compUrlMatch[1] : '';

    if (INCLUDE_COMPETITIONS && !INCLUDE_COMPETITIONS.includes(compSlug)) continue;

    // Pretty competition name from slug
    const competition = decodeEntities(
      compSlug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    );

    // Extract home team
    const localMatch = inner.match(/<td\s+class="local">([\s\S]*?)<\/td>/);
    const homeTeam = extractTeam(localMatch?.[1] || '');

    // Extract away team
    const visitanteMatch = inner.match(/<td\s+class="visitante">([\s\S]*?)<\/td>/);
    const awayTeam = extractTeam(visitanteMatch?.[1] || '');

    // Extract channels
    const canalesMatch = inner.match(/<ul\s+class="listaCanales">([\s\S]*?)<\/ul>/);
    const channels = [];
    if (canalesMatch) {
      const liRe = /<li[^>]*title="([^"]*)"[^>]*>/g;
      let liMatch;
      while ((liMatch = liRe.exec(canalesMatch[1])) !== null) {
        const rawName = decodeEntities(liMatch[1]);
        const cleaned = cleanChannelName(rawName);
        if (cleaned && !EXCLUDE_CHANNELS.has(normalizeChannel(cleaned))) {
          channels.push(cleaned);
        }
      }
    }

    if (homeTeam.name && awayTeam.name) {
      events.push({ time, competition, compSlug, homeTeam, awayTeam, channels });
    }
  }

  return events;
}

function extractTeam(html) {
  const nameMatch = html.match(/<span\s+title="([^"]+)"/);
  const imgMatch = html.match(/<img\s+src="([^"]+)"/);
  return {
    name: nameMatch ? decodeEntities(nameMatch[1]) : '',
    badge: imgMatch ? imgMatch[1] : '',
  };
}

async function fetchAcestreams() {
  const res = await fetch('https://api.acestream.me/all?api_version=1&api_key=test_api_key');
  if (!res.ok) throw new Error(`Acestream API failed: ${res.status}`);
  const data = await res.json();
  // data is { channels: [...] } or just an array
  return Array.isArray(data) ? data : (data.channels || []);
}

function matchAcestreams(channelName, acestreams) {
  const normalized = normalizeChannel(channelName);
  const patterns = CHANNEL_MAP[normalized];

  // No mapping found — skip
  if (!patterns) return [];
  // Empty array = known non-streamable channel
  if (patterns.length === 0) return [];

  const results = [];
  for (const pattern of patterns) {
    const patLower = pattern.toLowerCase();
    for (const stream of acestreams) {
      if (stream.name && stream.name.toLowerCase().includes(patLower)) {
        results.push({
          name: stream.name,
          id: stream.infohash,
          availability: stream.availability ?? null,
        });
      }
    }
  }

  // Filter out non-Spanish streams (e.g. DAZN [DE], [IT])
  const filtered = results.filter(s => !/\[(DE|IT|FR|UK|PT)\]/i.test(s.name));

  // Deduplicate by infohash
  const seen = new Set();
  const unique = filtered.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Sort by availability descending
  unique.sort((a, b) => (b.availability ?? 0) - (a.availability ?? 0));
  return unique;
}

async function main() {
  console.log('Fetching futbolenlatv.es...');
  const html = await fetchHTML('https://www.futbolenlatv.es/');

  console.log('Parsing events...');
  const rawEvents = parseEvents(html);
  console.log(`Found ${rawEvents.length} events for today`);

  console.log('Fetching acestream channels...');
  const acestreams = await fetchAcestreams();
  console.log(`Got ${acestreams.length} acestream channels`);

  // Build final events with acestream mappings
  const events = rawEvents.map(ev => ({
    time: ev.time,
    competition: ev.competition,
    homeTeam: ev.homeTeam,
    awayTeam: ev.awayTeam,
    channels: ev.channels.map(ch => ({
      name: ch,
      streams: matchAcestreams(ch, acestreams),
    })),
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    events,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Written ${events.length} events to ${OUT_PATH}`);

  // Summary
  const withStreams = events.filter(e => e.channels.some(c => c.streams.length > 0));
  console.log(`${withStreams.length} events have at least one acestream channel`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
