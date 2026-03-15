#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import he from 'he';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Channel, Competition, Sport, agendaSchema, type Stream } from '../../src/lib/channels';
import type { ScrapedChannel } from '../scrape-channels/types';
import type { RawEvent, EspnEntry } from './types';
import { scrapeEspnScoreboard, ESPN_BROADCAST_MAP } from './espn-scoreboard';
import { scrapeWheresthematch, WTM_BROADCAST_MAP } from './wheresthematch';

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
  // Basketball-specific broadcast names
  'dazn baloncesto (m73 o126)': Channel.DAZN_BALONCESTO,
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
  [/\bDAZN\s+Baloncesto\b/i, Channel.DAZN_BALONCESTO],
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
  // UK channels
  [/\bSky\s*Sports?\s*Main\s*Event\b/i, Channel.SKY_SPORTS_MAIN_EVENT],
  [/\bSky\s*Sports?\s*Football\b/i, Channel.SKY_SPORTS_FOOTBALL],
  [/\bSky\s*Sports?\s*Premier\s*League\b/i, Channel.SKY_SPORTS_PREMIER_LEAGUE],
  [/\bSkySP\s*PL\b/i, Channel.SKY_SPORTS_PREMIER_LEAGUE],
  [/\bSky\s*Sports?\s*Action\b/i, Channel.SKY_SPORTS_ACTION],
  [/\bSky\s*Sports?\s*Tennis\b/i, Channel.SKY_SPORTS_TENNIS],
  [/\bSky\s*Sports?\s*Golf\b/i, Channel.SKY_SPORTS_GOLF],
  [/\bSky\s*Sports?\s*F1\b/i, Channel.SKY_SPORTS_F1],
  [/\bSky\s*Sports?\s*Cricket\b/i, Channel.SKY_SPORTS_CRICKET],
  [/\bSky\s*Sports?\s*Mix\b/i, Channel.SKY_SPORTS_MIX],
  [/\bSky\s*Sports?\s*Arena\b/i, Channel.SKY_SPORTS_ARENA],
  [/\bTNT\s*Sports\s+1\b/i, Channel.TNT_SPORTS_1],
  [/\bTNT\s*Sports\s+2\b/i, Channel.TNT_SPORTS_2],
  [/\bTNT\s*Sports\s+3\b/i, Channel.TNT_SPORTS_3],
  [/\bTNT\s*Sports\s+4\b/i, Channel.TNT_SPORTS_4],
  [/\bTNT\s+Sports\b/i, Channel.TNT_SPORTS_1],
  [/\bBT\s*Sport\s+1\b/i, Channel.TNT_SPORTS_1],
  [/\bBT\s*Sport\s+2\b/i, Channel.TNT_SPORTS_2],
  [/\bBT\s*Sport\s+3\b/i, Channel.TNT_SPORTS_3],
  [/\bPremier\s*Sports?\s+1\b/i, Channel.PREMIER_SPORTS_1],
  [/\bPremier\s*Sports?\s+2\b/i, Channel.PREMIER_SPORTS_2],
  // International channels
  [/\bbeIN\s*Sports?\s+1\b/i, Channel.BEIN_SPORTS_1],
  [/\bbeIN\s*Sports?\s+2\b/i, Channel.BEIN_SPORTS_2],
  [/\bbeIN\s*Sports?\s+3\b/i, Channel.BEIN_SPORTS_3],
  [/\bESPN\s*2\b/i, Channel.ESPN_2],
  [/\bESPN\b/i, Channel.ESPN],
  [/\bFox\s*Sports?\s+2\b/i, Channel.FOX_SPORTS_2],
  [/\bFox\s*Sports?\s+1\b/i, Channel.FOX_SPORTS_1],
  // US channels
  [/\bNBA\s*TV\b/i, Channel.NBA_TV],
  [/\bUSA\s*Network\b/i, Channel.USA_NETWORK],
  [/\bCBS\s*Sports?\b/i, Channel.CBS_SPORTS],
  [/\bNBCS?N?\b/i, Channel.NBC],
  [/\bNBC\b/i, Channel.NBC],
  [/\bABC\b/i, Channel.ABC],
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
  // Basketball
  'nba league pass', 'courtside 1891',
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

// Basketball competition config: maps futbolenlatv basketball slug → canonical name + ESPN league code.
const BASKETBALL_COMPETITION_CONFIG: Record<string, { name: Competition; espn?: string }> = {
  'liga-endesa': { name: Competition.LIGA_ENDESA },
  'euroliga': { name: Competition.EUROLEAGUE },
  'nba': { name: Competition.NBA, espn: 'nba' },
  'basketball-champions-league': { name: Competition.BASKETBALL_CHAMPIONS_LEAGUE },
  'liga-leb-oro': { name: Competition.PRIMERA_FEB },
  'liga-femenina-baloncesto': { name: Competition.LIGA_FEMENINA_BALONCESTO },
  'fiba-europe-cup': { name: Competition.FIBA_EUROPE_CUP },
};

// Reverse map: Competition → ESPN league code (for badge lookups from any source)
const COMPETITION_ESPN_CODES: Partial<Record<Competition, string>> = {};
for (const cfg of Object.values(COMPETITION_CONFIG)) {
  if (cfg.espn) COMPETITION_ESPN_CODES[cfg.name] = cfg.espn;
}
for (const cfg of Object.values(BASKETBALL_COMPETITION_CONFIG)) {
  if (cfg.espn) COMPETITION_ESPN_CODES[cfg.name] = cfg.espn;
}

const INCLUDE_COMPETITIONS = new Set(Object.keys(COMPETITION_CONFIG));
const INCLUDE_TENNIS_COMPETITIONS = new Set(Object.keys(TENNIS_COMPETITION_CONFIG));
const INCLUDE_BASKETBALL_COMPETITIONS = new Set(Object.keys(BASKETBALL_COMPETITION_CONFIG));

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

function parseTennisEvents(html: string, day: 'today' | 'tomorrow' = 'today') {
  const events: RawEvent[] = [];
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

    // Extract competition slug from anchor href
    const compMatch = inner.match(/<a\s+class="internalLink"\s+href="\/deporte\/tenis\/competicion\/([^"]+)"/);
    const compSlug = compMatch ? compMatch[1] : '';

    if (!INCLUDE_TENNIS_COMPETITIONS.has(compSlug)) continue;

    const competition = TENNIS_COMPETITION_CONFIG[compSlug].name;

    // Skip round-only events (no individual players listed)
    if (/eventoUnaColumna/.test(inner)) continue;

    // Extract players (reuse local/visitante structure)
    const localMatch = inner.match(/<td\s+class="local">([\s\S]*?)<\/td>/);
    const visitanteMatch = inner.match(/<td\s+class="visitante">([\s\S]*?)<\/td>/);
    const homeTeam = extractPlayer(localMatch?.[1] || '');
    const awayTeam = extractPlayer(visitanteMatch?.[1] || '');

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
      events.push({ time, sport: Sport.TENNIS, competition, compSlug, homeTeam, awayTeam, channels });
    }
  }

  return events;
}

function parseBasketballEvents(html: string, day: 'today' | 'tomorrow' = 'today') {
  const events: RawEvent[] = [];
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

    // Extract competition slug from anchor href (sport subpage format)
    const compMatch = inner.match(/<a\s+class="internalLink"\s+href="\/deporte\/baloncesto\/competicion\/([^"]+)"/);
    const compSlug = compMatch ? compMatch[1] : '';

    if (!INCLUDE_BASKETBALL_COMPETITIONS.has(compSlug)) continue;

    const competition = BASKETBALL_COMPETITION_CONFIG[compSlug].name;

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
      events.push({ time, sport: Sport.BASKETBALL, competition, compSlug, homeTeam, awayTeam, channels });
    }
  }

  return events;
}

function extractPlayer(html: string) {
  const nameMatch = html.match(/<span\s+title="([^"]+)"/);
  const imgMatch = html.match(/<img\s+src="([^"]+)"/);
  return {
    name: nameMatch ? decodeEntities(nameMatch[1]) : '',
    badge: imgMatch ? imgMatch[1] : '',
  };
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

// --- ESPN tennis player headshot lookup ---

async function fetchEspnTennisPlayers() {
  const playerMap = new Map<string, string>(); // normalized name → headshot URL

  for (const league of ['atp', 'wta']) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/tennis/${league}/rankings`);
      if (!res.ok) continue;
      const data = await res.json();
      const rankings = data.rankings?.[0]?.ranks || [];
      for (const rank of rankings) {
        const athlete = rank.athlete;
        if (!athlete?.displayName || !athlete?.headshot) continue;
        const headshot = athlete.headshot;
        const name = normalizeTeamName(athlete.displayName);
        playerMap.set(name, headshot);
        // Also index by shortName (e.g. "A. Sabalenka")
        if (athlete.shortName) {
          playerMap.set(normalizeTeamName(athlete.shortName), headshot);
        }
      }
    } catch (err: unknown) {
      console.warn(`Failed to fetch ESPN ${league} rankings: ${(err as Error).message}`);
    }
  }

  return playerMap;
}

async function fetchBasketballTeams(espnLeagueCodes: string[]) {
  const teamMap = new Map<string, EspnEntry>();

  // EuroLeague/incrowdsports API — covers Liga Endesa, EuroLeague, BCL, and 190+ European clubs
  try {
    const res = await fetch('https://api-live.euroleague.net/v2/clubs');
    if (res.ok) {
      const data = await res.json();
      const clubs = (data.data || []) as { name: string; alias: string; isVirtual: boolean; images: { crest?: string } }[];
      for (const club of clubs) {
        if (club.isVirtual || !club.images?.crest || club.name.startsWith('U18')) continue;
        for (const name of [club.name, club.alias]) {
          if (name) teamMap.set(normalizeTeamName(name), { logo: club.images.crest });
        }
      }
    }
  } catch (err: unknown) {
    console.warn(`Failed to fetch EuroLeague clubs: ${(err as Error).message}`);
  }

  // ESPN NBA/WNBA — complements EuroLeague data for American teams
  for (const code of espnLeagueCodes) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/${code}/teams`);
      if (!res.ok) continue;
      const data = await res.json();
      const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
      for (const { team } of teams) {
        const logo = team.logos?.[0]?.href;
        if (!logo) continue;
        for (const name of [team.displayName, team.shortDisplayName, team.name]) {
          if (name) teamMap.set(normalizeTeamName(name), { logo });
        }
      }
    } catch (err: unknown) {
      console.warn(`Failed to fetch ESPN basketball teams for ${code}: ${(err as Error).message}`);
    }
  }

  return teamMap;
}

function findEspnPlayer(playerName: string, espnPlayers: Map<string, string>) {
  const normalized = normalizeTeamName(playerName);

  // Exact match
  if (espnPlayers.has(normalized)) return espnPlayers.get(normalized);

  // Extract last name(s) for fuzzy matching (e.g. "A. Sabalenka" → "sabalenka")
  // Handles abbreviated first names like "A.", "D.", "J." from futbolenlatv
  const lastName = normalized.replace(/^[a-z]\.\s*/, '').trim();

  for (const [espnName, headshot] of espnPlayers) {
    if (espnName.endsWith(lastName) || normalized.includes(espnName) || espnName.includes(normalized)) {
      return headshot;
    }
  }

  return null;
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
    if (/\[(DE|IT|FR|PT)\]/i.test(stream.name)) continue;

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
// Supports both futbolenlatv (BROADCAST_MAP) and wheresthematch (WTM_BROADCAST_MAP) channel names.
function deduplicateChannels(channels: string[], classifiedStreams: Map<Channel, Stream[]>) {
  const seen = new Map();
  for (const ch of channels) {
    const standard = BROADCAST_MAP[ch.toLowerCase()] ?? WTM_BROADCAST_MAP[ch] ?? ESPN_BROADCAST_MAP[ch];
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

// --- Event merging ---

// Additional aliases for merging team names across sources
const MERGE_ALIASES: Record<string, string> = {
  ...TEAM_ALIASES,
  'manchester utd.': 'manchester united',
  'manchester utd': 'manchester united',
  'tottenham': 'tottenham hotspur',
  'tottenham hotspur': 'tottenham hotspur',
  'leeds utd': 'leeds united',
  'leeds utd.': 'leeds united',
  'newcastle utd': 'newcastle united',
  'newcastle utd.': 'newcastle united',
  'sheffield utd': 'sheffield united',
  'sheffield utd.': 'sheffield united',
  'west ham': 'west ham united',
  'wolverhampton': 'wolverhampton wanderers',
  'wolves': 'wolverhampton wanderers',
  'brighton': 'brighton and hove albion',
  'nott. forest': 'nottingham forest',
  'inter milan': 'inter',
  'inter de milan': 'inter',
  'internazionale': 'inter',
  'hellas verona': 'verona',
  'como 1907': 'como',
  'as roma': 'roma',
  'ac milan': 'milan',
  'pisa sporting club': 'pisa',
  'pisa sc': 'pisa',
  'celta': 'celta vigo',
  'celta de vigo': 'celta vigo',
  'at. madrid': 'atletico madrid',
  'atletico de madrid': 'atletico madrid',
  'ath. bilbao': 'athletic bilbao',
  'deportivo la coruna': 'deportivo',
  'deportivo la coruna women': 'deportivo women',
  'sevilla fc': 'sevilla',
  'real sociedad b': 'real sociedad ii',
  'granada cf': 'granada',
  'rb leipzig': 'leipzig',
  'mainz 05': 'mainz',
  '1. fc union berlin': 'union berlin',
  'fc barcelona': 'barcelona',
  'werder bremen': 'bremen',
};

function normalizeForMerge(name: string): string {
  let n = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(CF|FC|CD|UD|RCD|SD|RC|CA|SC|SS|SE|AD)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return MERGE_ALIASES[n] ?? n;
}

function eventKey(ev: RawEvent): string {
  return `${ev.competition}|${normalizeForMerge(ev.homeTeam.name)}|${normalizeForMerge(ev.awayTeam.name)}`;
}

// Fuzzy match: check if two normalized team names refer to the same team
function teamsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Substring match (e.g., "verona" matches "hellas verona")
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

function mergeEvents(primary: RawEvent[], secondary: RawEvent[]): RawEvent[] {
  const map = new Map<string, RawEvent>();
  for (const ev of primary) {
    map.set(eventKey(ev), ev);
  }
  for (const ev of secondary) {
    const key = eventKey(ev);
    let existing = map.get(key);

    // If exact key match failed, try fuzzy matching within same competition
    if (!existing) {
      const secHome = normalizeForMerge(ev.homeTeam.name);
      const secAway = normalizeForMerge(ev.awayTeam.name);
      for (const [, candidate] of map) {
        if (candidate.competition !== ev.competition) continue;
        const candHome = normalizeForMerge(candidate.homeTeam.name);
        const candAway = normalizeForMerge(candidate.awayTeam.name);
        if (teamsMatch(candHome, secHome) && teamsMatch(candAway, secAway)) {
          existing = candidate;
          break;
        }
      }
    }

    if (existing) {
      // Merge channels from secondary source into existing event
      const existingSet = new Set(existing.channels.map(c => c.toLowerCase()));
      for (const ch of ev.channels) {
        if (!existingSet.has(ch.toLowerCase())) {
          existing.channels.push(ch);
        }
      }
    } else {
      map.set(key, ev);
    }
  }
  return [...map.values()];
}


function buildEvents(
  rawEvents: RawEvent[],
  espnTeams: Map<string, EspnEntry>,
  espnPlayers: Map<string, string>,
  basketballTeams: Map<string, EspnEntry>,
  classifiedStreams: Map<Channel, Stream[]>,
) {
  return rawEvents.map(ev => {
    let homeBadge: string;
    let awayBadge: string;

    if (ev.sport === Sport.TENNIS) {
      homeBadge = findEspnPlayer(ev.homeTeam.name, espnPlayers) || '';
      awayBadge = findEspnPlayer(ev.awayTeam.name, espnPlayers) || '';
    } else if (ev.sport === Sport.BASKETBALL) {
      const homeEspn = findEspnTeam(ev.homeTeam.name, basketballTeams);
      const awayEspn = findEspnTeam(ev.awayTeam.name, basketballTeams);
      homeBadge = homeEspn?.logo || ev.homeTeam.badge;
      awayBadge = awayEspn?.logo || ev.awayTeam.badge;
    } else {
      const homeEspn = findEspnTeam(ev.homeTeam.name, espnTeams);
      const awayEspn = findEspnTeam(ev.awayTeam.name, espnTeams);
      homeBadge = homeEspn?.logo || ev.homeTeam.badge;
      awayBadge = awayEspn?.logo || ev.awayTeam.badge;
    }

    return {
      time: ev.time,
      sport: ev.sport,
      competition: ev.competition,
      homeTeam: { name: ev.homeTeam.name, badge: homeBadge },
      awayTeam: { name: ev.awayTeam.name, badge: awayBadge },
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
  const todayDate = new Date().toISOString().split('T')[0];
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowDate = tomorrowDateObj.toISOString().split('T')[0];

  // Fetch all sources in parallel
  console.log('Fetching futbolenlatv.es, wheresthematch.com and ESPN scoreboard...');
  const [footballHtml, tennisHtml, basketballHtml, wtmToday, wtmTomorrow, espnToday, espnTomorrow] = await Promise.all([
    fetchHTML('https://www.futbolenlatv.es/'),
    fetchHTML('https://www.futbolenlatv.es/deporte/tenis'),
    fetchHTML('https://www.futbolenlatv.es/deporte/baloncesto'),
    scrapeWheresthematch(todayDate, true),
    scrapeWheresthematch(tomorrowDate, false),
    scrapeEspnScoreboard(todayDate),
    scrapeEspnScoreboard(tomorrowDate),
  ]);

  console.log('Parsing football events...');
  const footballTodayRaw = parseEvents(footballHtml, 'today', Sport.FOOTBALL);
  const footballTomorrowRaw = parseEvents(footballHtml, 'tomorrow', Sport.FOOTBALL);
  console.log(`Found ${footballTodayRaw.length} football events for today, ${footballTomorrowRaw.length} for tomorrow`);

  console.log('Parsing tennis events...');
  const tennisTodayRaw = parseTennisEvents(tennisHtml, 'today');
  const tennisTomorrowRaw = parseTennisEvents(tennisHtml, 'tomorrow');
  console.log(`Found ${tennisTodayRaw.length} tennis events for today, ${tennisTomorrowRaw.length} for tomorrow`);

  console.log('Parsing basketball events...');
  const basketballTodayRaw = parseBasketballEvents(basketballHtml, 'today');
  const basketballTomorrowRaw = parseBasketballEvents(basketballHtml, 'tomorrow');
  console.log(`Found ${basketballTodayRaw.length} basketball events for today, ${basketballTomorrowRaw.length} for tomorrow`);

  // Merge futbolenlatv (primary) → wheresthematch (secondary) → ESPN scoreboard (tertiary)
  const ftlvToday = [...footballTodayRaw, ...tennisTodayRaw, ...basketballTodayRaw];
  const ftlvTomorrow = [...footballTomorrowRaw, ...tennisTomorrowRaw, ...basketballTomorrowRaw];

  const todayRaw = mergeEvents(mergeEvents(ftlvToday, wtmToday), espnToday);
  const tomorrowRaw = mergeEvents(mergeEvents(ftlvTomorrow, wtmTomorrow), espnTomorrow);
  console.log(`After merge: ${todayRaw.length} events today, ${tomorrowRaw.length} events tomorrow`);

  // Fetch ESPN data for badges/headshots (using merged events to capture both sources)
  const allMerged = [...todayRaw, ...tomorrowRaw];
  const footballEvents = allMerged.filter(ev => ev.sport === Sport.FOOTBALL);
  const espnCodes = [...new Set(footballEvents.map(ev => {
    // Try compSlug first (futbolenlatv), then Competition→ESPN map (any source)
    return COMPETITION_CONFIG[ev.compSlug]?.espn ?? COMPETITION_ESPN_CODES[ev.competition as Competition];
  }).filter((c): c is string => Boolean(c)))];
  console.log(`Fetching ESPN badges for: ${espnCodes.join(', ') || 'none'}...`);

  const hasTennis = allMerged.some(ev => ev.sport === Sport.TENNIS);
  if (hasTennis) console.log('Fetching ESPN tennis player headshots...');

  const hasBasketball = allMerged.some(ev => ev.sport === Sport.BASKETBALL);
  const basketballEvents = allMerged.filter(ev => ev.sport === Sport.BASKETBALL);
  const espnBasketballCodes = [...new Set(basketballEvents.map(ev => {
    return BASKETBALL_COMPETITION_CONFIG[ev.compSlug]?.espn ?? COMPETITION_ESPN_CODES[ev.competition as Competition];
  }).filter((c): c is string => Boolean(c)))];
  if (hasBasketball) console.log('Fetching basketball team badges (EuroLeague + ESPN)...');

  const [espnTeams, espnPlayers, basketballTeams] = await Promise.all([
    fetchEspnTeams(espnCodes),
    hasTennis ? fetchEspnTennisPlayers() : Promise.resolve(new Map<string, string>()),
    hasBasketball ? fetchBasketballTeams(espnBasketballCodes) : Promise.resolve(new Map<string, EspnEntry>()),
  ]);
  console.log(`Got ${espnTeams.size} ESPN team entries`);
  if (hasTennis) console.log(`Got ${espnPlayers.size} ESPN tennis player entries`);
  if (hasBasketball) console.log(`Got ${basketballTeams.size} basketball team entries`);

  console.log('Loading acestream channels...');
  const acestreams = loadAcestreams();
  console.log(`Got ${acestreams.length} acestream channels`);

  const classifiedStreams = classifyAcestreams(acestreams);
  console.log(`Classified into ${classifiedStreams.size} standard channels`);

  const now = new Date().toISOString();
  mkdirSync(dirname(OUT_PATH), { recursive: true });

  // Today
  const todayEvents = buildEvents(todayRaw, espnTeams, espnPlayers, basketballTeams, classifiedStreams);
  const todayOutput = agendaSchema.parse({
    generatedAt: now,
    date: new Date().toISOString().split('T')[0],
    events: todayEvents,
  });
  writeFileSync(OUT_PATH, JSON.stringify(todayOutput, null, 2));
  console.log(`Written ${todayEvents.length} events to ${OUT_PATH}`);

  // Tomorrow
  const tomorrowEvents = buildEvents(tomorrowRaw, espnTeams, espnPlayers, basketballTeams, classifiedStreams);
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
