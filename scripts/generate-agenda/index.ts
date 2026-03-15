#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import he from 'he';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Channel, Competition, Sport, agendaSchema, type Stream } from '../../src/lib/channels';
import type { ScrapedChannel } from '../scrape-channels/types';
import type { RawEvent, EspnEntry } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../../data/agenda.json');
const CHANNELS_PATH = resolve(__dirname, '../../data/acestream-channels.json');

// Maps exact raw channel names (from futbolenlatv, lowercased) → canonical channel name.
// Names sourced from https://www.futbolenlatv.es/canal
const BROADCAST_MAP: Record<string, Channel> = {
  // DAZN
  'dazn 1 (m71)': Channel.DAZN_1,
  'dazn 2 (m72)': Channel.DAZN_2,
  'dazn 3 (m196)': Channel.DAZN_3,
  'dazn 4 (m197)': Channel.DAZN_4,
  'dazn laliga (m55 o113)': Channel.DAZN_LALIGA_1,
  'dazn laliga 2 (m58 o114)': Channel.DAZN_LALIGA_2,
  'dazn 1 bar (m148)': Channel.DAZN_1_BAR,
  'dazn 2 bar (m149)': Channel.DAZN_2_BAR,
  // Movistar+ LaLiga
  'm+ laliga (m54 o110)': Channel.M_LALIGA,
  'm+ laliga 2 (m57 o112)': Channel.M_LALIGA_2,
  'm+ laliga hdr (m440 o111)': Channel.M_LALIGA,
  // Movistar+ Liga de Campeones
  'm+ liga de campeones (m60 o115)': Channel.M_LIGA_DE_CAMPEONES,
  'm+ liga de campeones 2 (m61 o117)': Channel.M_LIGA_DE_CAMPEONES_2,
  'm+ liga de campeones 3 (m62 o118)': Channel.M_LIGA_DE_CAMPEONES_3,
  'm+ liga de campeones 4 (m180 o119)': Channel.M_LIGA_DE_CAMPEONES_4,
  // Movistar+ Deportes
  'movistar plus+ (m7): ver partido': Channel.MOVISTAR_PLUS,
  'm+ deportes': Channel.M_DEPORTES,
  'm+ deportes 2': Channel.M_DEPORTES_2,
  // Movistar+ Vamos
  'm+ vamos (8 y 50)': Channel.VAMOS,
  // Other
  'gol play': Channel.GOL_PLAY,
  'teledeporte': Channel.TELEDEPORTE,
  'la 1 tve': Channel.LA_1,
  'tv3 (cataluña)': Channel.TV3,
  'etb1 (país vasco)': Channel.ETB,
  'eurosport 1': Channel.EUROSPORT_1,
  'eurosport 2': Channel.EUROSPORT_2,
  'mega': Channel.MEGA,
  // LaLiga TV Bar
  'laliga tv bar': Channel.LALIGA_TV_BAR,
  'laliga tv m2': Channel.LALIGA_TV_BAR_2,
  'laliga tv m3': Channel.LALIGA_TV_BAR_3,
  'laliga tv m4': Channel.LALIGA_TV_BAR_3,
  // Hypermotion
  'laliga tv hypermotion (m56 o120): ver partido': Channel.HYPERMOTION,
  'laliga tv hypermotion 2 (m59 o121): ver partido': Channel.HYPERMOTION_2,
  // Tennis-specific broadcast names
  'm+ #vamos bar (304)': Channel.VAMOS_BAR,
  'm+ deportes 2 (64)': Channel.M_DEPORTES_2,
  'movistar+': Channel.MOVISTAR_PLUS,
  'm+ deportes (m63)': Channel.M_DEPORTES,
  'm+ deportes 2 (m64)': Channel.M_DEPORTES_2,
  'm+ deportes 3 (m198)': Channel.M_DEPORTES_3,
};

// Maps acestream channel names → canonical channel name.
// Each entry: [regex, channelName]. Order matters — more specific patterns first.
// Tested against each acestream stream name to classify it.
const ACESTREAM_PATTERNS: [RegExp, Channel][] = [
  [/\bDAZN F1\b/i, Channel.DAZN_F1],
  [/\bDAZN\s+2\s+BAR\b/i, Channel.DAZN_2_BAR],
  [/\bDAZN\s+\d+\s+BAR\b/i, Channel.DAZN_1_BAR],
  [/\bDAZN\s+LA\s+LIGA\s+2\b/i, Channel.DAZN_LALIGA_2],
  [/\bDAZN\s+LA\s+LIGA\s+1?\b/i, Channel.DAZN_LALIGA_1],
  [/\bDAZN 1\b/i, Channel.DAZN_1],
  [/\bDAZN 2\b/i, Channel.DAZN_2],
  [/\bDAZN 3\b/i, Channel.DAZN_3],
  [/\bDAZN 4\b/i, Channel.DAZN_4],
  [/\bM[.+]\s*LaLiga\s+2\b/i, Channel.M_LALIGA_2],
  [/\bMovistar\s*LaLiga\s+2\b/i, Channel.M_LALIGA_2],
  [/\bM[.+]\s*LaLiga\b/i, Channel.M_LALIGA],
  [/\bMovistar\s*LaLiga\b/i, Channel.M_LALIGA],
  [/\bLiga de Campeones\s+4\b/i, Channel.M_LIGA_DE_CAMPEONES_4],
  [/\bM[.+]\s*Liga de Campeones\s+4\b/i, Channel.M_LIGA_DE_CAMPEONES_4],
  [/\bChampions\s+4\b/i, Channel.M_LIGA_DE_CAMPEONES_4],
  [/\bLiga de Campeones\s+3\b/i, Channel.M_LIGA_DE_CAMPEONES_3],
  [/\bM[.+]\s*Liga de Campeones\s+3\b/i, Channel.M_LIGA_DE_CAMPEONES_3],
  [/\bChampions\s+3\b/i, Channel.M_LIGA_DE_CAMPEONES_3],
  [/\bLiga de Campeones\s+2\b/i, Channel.M_LIGA_DE_CAMPEONES_2],
  [/\bM[.+]\s*Liga de Campeones\s+2\b/i, Channel.M_LIGA_DE_CAMPEONES_2],
  [/\bChampions\s+2\b/i, Channel.M_LIGA_DE_CAMPEONES_2],
  [/\bLiga de Campeones\b/i, Channel.M_LIGA_DE_CAMPEONES],
  [/\bM[.+]\s*Liga de Campeones\b/i, Channel.M_LIGA_DE_CAMPEONES],
  [/\bChampions\b/i, Channel.M_LIGA_DE_CAMPEONES],
  [/\bM[.+]\s*Deportes\s+3\b/i, Channel.M_DEPORTES_3],
  [/\bMovistar\s*Deportes\s+3\b/i, Channel.M_DEPORTES_3],
  [/\bM[.+]\s*Deportes\s+2\b/i, Channel.M_DEPORTES_2],
  [/\bMovistar\s*Deportes\s+2\b/i, Channel.M_DEPORTES_2],
  [/\bM[.+]\s*Deportes\b/i, Channel.M_DEPORTES],
  [/\bMovistar\s*Deportes\b/i, Channel.M_DEPORTES],
  [/\bMovistar\s*Plus\b/i, Channel.MOVISTAR_PLUS],
  [/\bVamos\s*Bar\b/i, Channel.VAMOS_BAR],
  [/\bVamos\b/i, Channel.VAMOS],
  [/\bGol\s*Play\b/i, Channel.GOL_PLAY],
  [/\bGol\b/i, Channel.GOL_PLAY],
  [/\bEurosport\s+2\b/i, Channel.EUROSPORT_2],
  [/\bEurosport(?:\s+1)?\b/i, Channel.EUROSPORT_1],
  [/\bTeledeporte\b/i, Channel.TELEDEPORTE],
  [/\bTDP\b/i, Channel.TELEDEPORTE],
  [/\bLa 1\b/i, Channel.LA_1],
  [/\bTVE\b/i, Channel.LA_1],
  [/\bLa 2\b/i, Channel.LA_2],
  [/\bTV3\b/i, Channel.TV3],
  [/\bETB\b/i, Channel.ETB],
  [/\bMega\b/i, Channel.MEGA],
  [/\bLaLiga\s*TV\s*Bar\b/i, Channel.LALIGA_TV_BAR],
  [/\bBar\s*LaLiga\b/i, Channel.LALIGA_TV_BAR],
  [/\bLaLiga\s*TV\s*Bar\s*2\b/i, Channel.LALIGA_TV_BAR_2],
  [/\bLaLiga\s*TV\s*M2\b/i, Channel.LALIGA_TV_BAR_2],
  [/\bLaLiga\s*TV\s*Bar\s*3\b/i, Channel.LALIGA_TV_BAR_3],
  [/\bLaLiga\s*TV\s*M3\b/i, Channel.LALIGA_TV_BAR_3],
  [/\bHYPERMOTION\s+3\b/i, Channel.HYPERMOTION_3],
  [/\bHYPERMOTION\s+2\b/i, Channel.HYPERMOTION_2],
  [/\bHYPERMOTION\b/i, Channel.HYPERMOTION],
];

// Channels to exclude from output (ticket sales, free apps, non-streamable, etc.)
// Values are exact raw names from futbolenlatv, lowercased.
const EXCLUDE_CHANNELS = new Set([
  'hellotickets', 'fifa+',
  'laliga+ plus',
  'dazn app gratis (ver gratis)',
  'dazn (ver en directo)',
  // Streaming-only / non-TV channels
  'wta tv', 'atp tennis tv', 'rtve play',
  'hbo max', 'movistar+ lite',
  'tennis channel - orange tv (131)',
  'canal por confirmar',
]);

// Competition config: maps futbolenlatv slug → canonical name + ESPN league code.
// Only competitions listed here are included in the output.
const COMPETITION_CONFIG: Record<string, { name: Competition; espn?: string }> = {
  'la-liga': { name: Competition.LALIGA_EA_SPORTS, espn: 'esp.1' },
  'segunda-division-espana': { name: Competition.LALIGA_HYPERMOTION, espn: 'esp.2' },
  'premier-league': { name: Competition.PREMIER_LEAGUE, espn: 'eng.1' },
  'bundesliga': { name: Competition.BUNDESLIGA, espn: 'ger.1' },
  'calcio-serie-a': { name: Competition.SERIE_A, espn: 'ita.1' },
  'ligue-1': { name: Competition.LIGUE_1, espn: 'fra.1' },
  'liga-campeones': { name: Competition.CHAMPIONS_LEAGUE, espn: 'uefa.champions' },
  'europa-league': { name: Competition.EUROPA_LEAGUE, espn: 'uefa.europa' },
  'uefa-europa-conference-league': { name: Competition.CONFERENCE_LEAGUE, espn: 'uefa.europa.conf' },
  'copa-del-rey': { name: Competition.COPA_DEL_REY, espn: 'esp.copa_del_rey' },
  'supercopa-espana': { name: Competition.SUPERCOPA_ESPANA },
  'primera-federacion': { name: Competition.PRIMERA_FEDERACION },
  'liga-f': { name: Competition.LIGA_F },
};

// Tennis competition config: maps futbolenlatv tennis slug → canonical name.
const TENNIS_COMPETITION_CONFIG: Record<string, { name: Competition }> = {
  // Grand Slams
  'roland-garros': { name: Competition.ROLAND_GARROS },
  'roland-garros-wta': { name: Competition.ROLAND_GARROS },
  'wimbledon': { name: Competition.WIMBLEDON },
  // ATP Masters 1000
  'masters-indian-wells': { name: Competition.ATP_MASTERS_1000 },
  'masters-miami': { name: Competition.ATP_MASTERS_1000 },
  'masters-montecarlo': { name: Competition.ATP_MASTERS_1000 },
  'masters-madrid': { name: Competition.ATP_MASTERS_1000 },
  'masters-roma': { name: Competition.ATP_MASTERS_1000 },
  'masters-canada': { name: Competition.ATP_MASTERS_1000 },
  'masters-cincinnati': { name: Competition.ATP_MASTERS_1000 },
  'masters-shangai': { name: Competition.ATP_MASTERS_1000 },
  'masters-paris': { name: Competition.ATP_MASTERS_1000 },
  // ATP 500
  'barcelona-open': { name: Competition.ATP_500 },
  'torneo-de-queens': { name: Competition.ATP_500 },
  'torneo-de-halle': { name: Competition.ATP_500 },
  'torneo-de-hamburgo': { name: Competition.ATP_500 },
  'citi-open-washington': { name: Competition.ATP_500 },
  'torneo-de-bastad': { name: Competition.ATP_500 },
  // ATP 250
  'torneo-de-munich': { name: Competition.ATP_250 },
  'torneo-estoril': { name: Competition.ATP_250 },
  'geneva-open': { name: Competition.ATP_250 },
  'torneo-de-eastbourne': { name: Competition.ATP_250 },
  'mallorca-championships': { name: Competition.ATP_250 },
  'torneo-hertogenbosch': { name: Competition.ATP_250 },
  'atp-250-gstaad': { name: Competition.ATP_250 },
  'open-umag': { name: Competition.ATP_250 },
  'torneo-de-kitzbuhel': { name: Competition.ATP_250 },
  'torneo-los-cabos': { name: Competition.ATP_250 },
  'atp-250-houston': { name: Competition.ATP_250 },
  'torneo-de-bucarest': { name: Competition.ATP_250 },
  'torneo-de-marrakech': { name: Competition.ATP_250 },
  'torneo-murcia': { name: Competition.ATP_250 },
  'stuttgart-atp': { name: Competition.ATP_250 },
  // ATP Finals
  'copa-masters-tenis': { name: Competition.ATP_FINALS },
  // WTA 1000
  'wta-indian-wells': { name: Competition.WTA_1000 },
  'wta-miami': { name: Competition.WTA_1000 },
  'wta-madrid-open': { name: Competition.WTA_1000 },
  'wta-roma': { name: Competition.WTA_1000 },
  // WTA 500
  'torneo-de-charleston': { name: Competition.WTA_500 },
  'wta-torneo-de-stuttgart': { name: Competition.WTA_500 },
  'wta-german-open': { name: Competition.WTA_500 },
  'wta-londres': { name: Competition.WTA_500 },
  'wta-torneo-de-eastbourne': { name: Competition.WTA_500 },
  // WTA 250
  'wta-torneo-bogota': { name: Competition.WTA_250 },
  'wta-torneo-rouen': { name: Competition.WTA_250 },
  'wta-torneo-rabat': { name: Competition.WTA_250 },
  'wta-estrasburgo': { name: Competition.WTA_250 },
  'wta-nottingham-open': { name: Competition.WTA_250 },
  'wta-bad-homburg-open': { name: Competition.WTA_250 },
  'wta-torneo-hertogenbosch': { name: Competition.WTA_250 },
  'torneo-de-linz': { name: Competition.WTA_250 },
  // Other
  'laver-cup': { name: Competition.LAVER_CUP },
  'fed-cup-finals': { name: Competition.BJK_CUP },
};

const INCLUDE_COMPETITIONS = new Set(Object.keys(COMPETITION_CONFIG));
const INCLUDE_TENNIS_COMPETITIONS = new Set(Object.keys(TENNIS_COMPETITION_CONFIG));

// Decode HTML entities (&#225; → á, &#233; → é, etc.)
function decodeEntities(str: string) {
  return he.decode(str);
}

async function fetchHTML(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseEvents(html: string, day: 'today' | 'tomorrow' = 'today', sport: Sport = Sport.FOOTBALL) {
  const events: RawEvent[] = [];
  const includeSet = sport === Sport.TENNIS ? INCLUDE_TENNIS_COMPETITIONS : INCLUDE_COMPETITIONS;
  const configMap = sport === Sport.TENNIS ? TENNIS_COMPETITION_CONFIG : COMPETITION_CONFIG;

  // Find all table rows
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let isTargetDay = false;
  let match;

  const dayPattern = day === 'today' ? /hoy/i : /ma[ñn]ana/i;

  while ((match = rowRe.exec(html)) !== null) {
    const rowHTML = match[0];
    const inner = match[1];

    // Check for header rows (date separators)
    if (/cabeceraTabla/.test(rowHTML)) {
      isTargetDay = dayPattern.test(decodeEntities(inner));
      continue;
    }

    if (!isTargetDay) continue;

    // Extract time
    const timeMatch = inner.match(/<td\s+class="hora[^"]*">\s*([\d:]+)\s*<\/td>/);
    if (!timeMatch) continue;
    const time = timeMatch[1];

    // Extract competition from schema.org URL
    const compUrlMatch = inner.match(/<meta\s+itemprop="url"\s+content="[^"]*\/competicion\/([^"]+)"/);
    const compSlug = compUrlMatch ? compUrlMatch[1] : '';

    if (!includeSet.has(compSlug)) continue;

    // Pretty competition name from slug
    const competition = configMap[compSlug].name;

    // Extract home team
    const localMatch = inner.match(/<td\s+class="local">([\s\S]*?)<\/td>/);
    const homeTeam = extractTeam(localMatch?.[1] || '');

    // Extract away team
    const visitanteMatch = inner.match(/<td\s+class="visitante">([\s\S]*?)<\/td>/);
    const awayTeam = extractTeam(visitanteMatch?.[1] || '');

    // Extract channels
    const canalesMatch = inner.match(/<ul\s+class="listaCanales">([\s\S]*?)<\/ul>/);
    const channels: string[] = [];
    if (canalesMatch) {
      const liRe = /<li[^>]*title="([^"]*)"[^>]*>/g;
      let liMatch;
      while ((liMatch = liRe.exec(canalesMatch[1])) !== null) {
        const rawName = decodeEntities(liMatch[1]);
        if (rawName && !EXCLUDE_CHANNELS.has(rawName.toLowerCase())) {
          channels.push(rawName);
        }
      }
    }

    if (homeTeam.name && awayTeam.name) {
      events.push({ time, sport, competition, compSlug, homeTeam, awayTeam, channels });
    }
  }

  return events;
}

function extractTeam(html: string) {
  const nameMatch = html.match(/<span\s+title="([^"]+)"/);
  const imgMatch = html.match(/<img\s+src="([^"]+)"/);
  return {
    name: nameMatch ? decodeEntities(nameMatch[1]) : '',
    badge: imgMatch ? imgMatch[1] : '',
  };
}

// --- ESPN badge lookup ---

// Map abbreviated/alternate team names (normalized) to ESPN-normalized names
const TEAM_ALIASES: Record<string, string> = {
  'at. madrid': 'atletico madrid',
  'ath. bilbao': 'athletic bilbao',  // Athletic Club
  'ath bilbao': 'athletic bilbao',
  'manchester utd.': 'manchester united',
  'manchester utd': 'manchester united',
};

function normalizeTeamName(name: string) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\b(CF|FC|CD|UD|RCD|SD|RC|CA|SC|SS|SE|AD)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchEspnTeams(leagueCodes: string[]) {
  const teamMap = new Map<string, EspnEntry>();

  for (const code of leagueCodes) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/teams`);
      if (!res.ok) continue;
      const data = await res.json();
      const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
      for (const { team } of teams) {
        const logo = team.logos?.[0]?.href;
        if (!logo) continue;
        // Index by multiple name variants for better matching
        for (const name of [team.displayName, team.shortDisplayName, team.name]) {
          if (name) teamMap.set(normalizeTeamName(name), { logo });
        }
      }
    } catch (err: unknown) {
      console.warn(`Failed to fetch ESPN teams for ${code}: ${(err as Error).message}`);
    }
  }

  return teamMap;
}

function findEspnTeam(teamName: string, espnTeams: Map<string, EspnEntry>) {
  const normalized = TEAM_ALIASES[normalizeTeamName(teamName)] ?? normalizeTeamName(teamName);

  // Exact match
  if (espnTeams.has(normalized)) return espnTeams.get(normalized);

  // Substring match (e.g. "atletico de madrid" contains "atletico madrid")
  for (const [espnName, entry] of espnTeams) {
    if (normalized.includes(espnName) || espnName.includes(normalized)) return entry;
  }

  return null;
}

function loadAcestreams(): ScrapedChannel[] {
  return JSON.parse(readFileSync(CHANNELS_PATH, 'utf-8'));
}

// Classify all acestream streams by standard channel name (once per run).
// Returns Map<channelName, Array<Stream>>
function classifyAcestreams(acestreams: ScrapedChannel[]) {
  const byChannel = new Map<Channel, Stream[]>();

  for (const stream of acestreams) {
    if (!stream.name) continue;
    // Filter out non-Spanish streams (e.g. DAZN [DE], [IT])
    if (/\[(DE|IT|FR|UK|PT)\]/i.test(stream.name)) continue;

    for (const [regex, standard] of ACESTREAM_PATTERNS) {
      if (regex.test(stream.name)) {
        if (!byChannel.has(standard)) byChannel.set(standard, []);
        const name = stream.name.replace(/^(.+?)\s*-->\s*(.+)$/, '$1 ($2)');
        byChannel.get(standard)!.push({
          name,
          id: stream.id,
          resolution: stream.resolution,
          ...(stream.recommended ? { recommended: true } : {}),
        });
        break; // first match wins
      }
    }
  }

  // Deduplicate by id
  for (const [key, streams] of byChannel) {
    const seen = new Set();
    const unique = streams.filter((s: Stream) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    byChannel.set(key, unique);
  }

  return byChannel;
}

// Deduplicate channels that resolve to the same standard name.
// Keeps the first (non-HDR) variant as the display name.
function deduplicateChannels(channels: string[], classifiedStreams: Map<Channel, Stream[]>) {
  const seen = new Map();
  for (const ch of channels) {
    const standard = BROADCAST_MAP[ch.toLowerCase()];
    if (!standard) {
      console.warn(`Unknown broadcast channel: "${ch}"`);
      continue;
    }
    if (seen.has(standard)) continue;
    seen.set(standard, {
      name: standard,
      streams: classifiedStreams.get(standard) || [],
    });
  }
  return [...seen.values()];
}


function buildEvents(
  rawEvents: RawEvent[],
  espnTeams: Map<string, EspnEntry>,
  classifiedStreams: Map<Channel, Stream[]>,
) {
  return rawEvents.map(ev => {
    const homeEspn = findEspnTeam(ev.homeTeam.name, espnTeams);
    const awayEspn = findEspnTeam(ev.awayTeam.name, espnTeams);
    return {
      time: ev.time,
      sport: ev.sport,
      competition: ev.competition,
      homeTeam: {
        name: ev.homeTeam.name,
        badge: homeEspn?.logo || ev.homeTeam.badge,
      },
      awayTeam: {
        name: ev.awayTeam.name,
        badge: awayEspn?.logo || ev.awayTeam.badge,
      },
      channels: deduplicateChannels(ev.channels, classifiedStreams),
    };
  });
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Fetching futbolenlatv.es...');
  const [footballHtml, tennisHtml] = await Promise.all([
    fetchHTML('https://www.futbolenlatv.es/'),
    fetchHTML('https://www.futbolenlatv.es/deporte/tenis'),
  ]);

  console.log('Parsing football events...');
  const footballTodayRaw = parseEvents(footballHtml, 'today', Sport.FOOTBALL);
  const footballTomorrowRaw = parseEvents(footballHtml, 'tomorrow', Sport.FOOTBALL);
  console.log(`Found ${footballTodayRaw.length} football events for today, ${footballTomorrowRaw.length} for tomorrow`);

  console.log('Parsing tennis events...');
  const tennisTodayRaw = parseEvents(tennisHtml, 'today', Sport.TENNIS);
  const tennisTomorrowRaw = parseEvents(tennisHtml, 'tomorrow', Sport.TENNIS);
  console.log(`Found ${tennisTodayRaw.length} tennis events for today, ${tennisTomorrowRaw.length} for tomorrow`);

  const todayRaw = [...footballTodayRaw, ...tennisTodayRaw];
  const tomorrowRaw = [...footballTomorrowRaw, ...tennisTomorrowRaw];

  // Fetch ESPN badges for football competitions across both days
  const allRaw = [...footballTodayRaw, ...footballTomorrowRaw];
  const espnCodes = [...new Set(allRaw.map(ev => COMPETITION_CONFIG[ev.compSlug]?.espn).filter((c): c is string => Boolean(c)))];
  console.log(`Fetching ESPN badges for: ${espnCodes.join(', ') || 'none'}...`);
  const espnTeams = await fetchEspnTeams(espnCodes);
  console.log(`Got ${espnTeams.size} ESPN team entries`);

  console.log('Loading acestream channels...');
  const acestreams = loadAcestreams();
  console.log(`Got ${acestreams.length} acestream channels`);

  const classifiedStreams = classifyAcestreams(acestreams);
  console.log(`Classified into ${classifiedStreams.size} standard channels`);

  const now = new Date().toISOString();
  mkdirSync(dirname(OUT_PATH), { recursive: true });

  // Today
  const todayEvents = buildEvents(todayRaw, espnTeams, classifiedStreams);
  const todayOutput = agendaSchema.parse({
    generatedAt: now,
    date: new Date().toISOString().split('T')[0],
    events: todayEvents,
  });
  writeFileSync(OUT_PATH, JSON.stringify(todayOutput, null, 2));
  console.log(`Written ${todayEvents.length} events to ${OUT_PATH}`);

  // Tomorrow
  const tomorrowEvents = buildEvents(tomorrowRaw, espnTeams, classifiedStreams);
  const tomorrowOutput = agendaSchema.parse({
    generatedAt: now,
    date: getTomorrowDate(),
    events: tomorrowEvents,
  });
  const tomorrowPath = OUT_PATH.replace('agenda.json', 'agenda-tomorrow.json');
  writeFileSync(tomorrowPath, JSON.stringify(tomorrowOutput, null, 2));
  console.log(`Written ${tomorrowEvents.length} events to ${tomorrowPath}`);

  // Summary
  const todayWithStreams = todayEvents.filter(e => e.channels.some(c => c.streams.length > 0));
  const tomorrowWithStreams = tomorrowEvents.filter(e => e.channels.some(c => c.streams.length > 0));
  console.log(`Today: ${todayWithStreams.length} events with acestream channels`);
  console.log(`Tomorrow: ${tomorrowWithStreams.length} events with acestream channels`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
