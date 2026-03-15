import he from 'he';
import { Channel, Competition, Sport } from '../../src/lib/channels';
import type { RawEvent } from './types';

// Maps wheresthematch channel title → canonical Channel enum.
const WTM_BROADCAST_MAP: Record<string, Channel> = {
  // Sky Sports
  'Sky Sports Main Event': Channel.SKY_SPORTS_MAIN_EVENT,
  'Sky Sports Football': Channel.SKY_SPORTS_FOOTBALL,
  'Sky Sports Premier League': Channel.SKY_SPORTS_PREMIER_LEAGUE,
  'Sky Sports Action': Channel.SKY_SPORTS_ACTION,
  'Sky Sports Tennis': Channel.SKY_SPORTS_TENNIS,
  'Sky Sports Golf': Channel.SKY_SPORTS_GOLF,
  'Sky Sports F1': Channel.SKY_SPORTS_F1,
  'Sky Sports Cricket': Channel.SKY_SPORTS_CRICKET,
  'Sky Sports Mix': Channel.SKY_SPORTS_MIX,
  'Sky Sports Arena': Channel.SKY_SPORTS_ARENA,
  // TNT Sports
  'TNT Sports 1': Channel.TNT_SPORTS_1,
  'TNT Sports 2': Channel.TNT_SPORTS_2,
  'TNT Sports 3': Channel.TNT_SPORTS_3,
  'TNT Sports 4': Channel.TNT_SPORTS_4,
  // Premier Sports
  'Premier Sports 1': Channel.PREMIER_SPORTS_1,
  'Premier Sports 2': Channel.PREMIER_SPORTS_2,
  // BBC / ITV
  'BBC1': Channel.BBC_ONE,
  'BBC One': Channel.BBC_ONE,
  'ITV1': Channel.ITV_1,
  'ITV 1': Channel.ITV_1,
  'ITV4': Channel.ITV_4,
  'ITV 4': Channel.ITV_4,
  // International
  'beIN Sports 1': Channel.BEIN_SPORTS_1,
  'beIN Sports 2': Channel.BEIN_SPORTS_2,
  'beIN Sports 3': Channel.BEIN_SPORTS_3,
  'ESPN': Channel.ESPN,
  'ESPN 2': Channel.ESPN_2,
  'FOX Sports 1': Channel.FOX_SPORTS_1,
  'FOX Sports 2': Channel.FOX_SPORTS_2,
  // Eurosport (reuse existing)
  'Eurosport 1': Channel.EUROSPORT_1,
  'Eurosport 2': Channel.EUROSPORT_2,
  // DAZN (reuse existing)
  'DAZN': Channel.DAZN_1,
};

// Channels to exclude (streaming-only, non-streamable, etc.)
const WTM_EXCLUDE_CHANNELS = new Set([
  'BBC iPlayer', 'BBC Sport Website', 'BBC Red Button', 'BBC Alba',
  'BBC2 Northern Ireland',
  'Sky Sports+', 'Sky Sports Ultra HDR', 'Sky One', 'Sky Sports Racing',
  'TNT Sports Extra', 'TNT Sports Ultimate',
  'Amazon Prime Video', 'Apple TV', 'Discovery+', 'Discovery+ Premium',
  'YouTube', 'WSL YouTube', 'WSL2 YouTube', 'Bundesliga YouTube',
  'Bundesliga App', 'DFB Play', 'Ligue 1+', 'Channel 4', 'Channel 4 app',
  'Channel 4 Sport YouTube',
  'NBA League Pass', 'NHL.TV',
  'Ary Digital',
]);

// Maps wheresthematch competition description → Competition enum + Sport.
// Only competitions listed here are included in the output.
const WTM_COMPETITION_MAP: Record<string, { name: Competition; sport: Sport }> = {
  // Football
  'Premier League': { name: Competition.PREMIER_LEAGUE, sport: Sport.FOOTBALL },
  'La Liga': { name: Competition.LALIGA_EA_SPORTS, sport: Sport.FOOTBALL },
  'Bundesliga': { name: Competition.BUNDESLIGA, sport: Sport.FOOTBALL },
  'Serie A': { name: Competition.SERIE_A, sport: Sport.FOOTBALL },
  'Ligue 1': { name: Competition.LIGUE_1, sport: Sport.FOOTBALL },
  'Champions League': { name: Competition.CHAMPIONS_LEAGUE, sport: Sport.FOOTBALL },
  'Europa League': { name: Competition.EUROPA_LEAGUE, sport: Sport.FOOTBALL },
  'Conference League': { name: Competition.CONFERENCE_LEAGUE, sport: Sport.FOOTBALL },
  'Copa del Rey': { name: Competition.COPA_DEL_REY, sport: Sport.FOOTBALL },
  'Liga F': { name: Competition.LIGA_F, sport: Sport.FOOTBALL },
  // Basketball
  'NBA': { name: Competition.NBA, sport: Sport.BASKETBALL },
  'EuroLeague': { name: Competition.EUROLEAGUE, sport: Sport.BASKETBALL },
  'Euroleague': { name: Competition.EUROLEAGUE, sport: Sport.BASKETBALL },
  // Tennis
  'ATP/WTA 1000: Indian Wells': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Miami': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Monte Carlo': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Madrid': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Rome': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Canada': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Cincinnati': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Shanghai': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP/WTA 1000: Paris': { name: Competition.ATP_MASTERS_1000, sport: Sport.TENNIS },
  'ATP World Tour': { name: Competition.ATP_500, sport: Sport.TENNIS },
  'WTA Tour': { name: Competition.WTA_500, sport: Sport.TENNIS },
  'Roland Garros': { name: Competition.ROLAND_GARROS, sport: Sport.TENNIS },
  'Wimbledon': { name: Competition.WIMBLEDON, sport: Sport.TENNIS },
};

function toMadridTime(utcIso: string): string {
  const date = new Date(utcIso);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Madrid',
  });
}

function toMadridDate(utcIso: string): string {
  const date = new Date(utcIso);
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }); // YYYY-MM-DD
}

export async function scrapeWheresthematch(targetDate: string, isToday: boolean): Promise<RawEvent[]> {
  // Today = default page (no date params), tomorrow = ?showdatestart=YYYYMMDD
  const dateParam = targetDate.replace(/-/g, '');
  const url = isToday
    ? 'https://www.wheresthematch.com/live-sport-on-tv/'
    : `https://www.wheresthematch.com/live-sport-on-tv/?showdatestart=${dateParam}`;

  console.log(`Fetching wheresthematch.com for ${targetDate}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
  });
  if (!res.ok) {
    console.warn(`Failed to fetch wheresthematch: ${res.status}`);
    return [];
  }
  const html = await res.text();

  return parseWtmEvents(html, targetDate);
}

function parseWtmEvents(html: string, targetDate: string): RawEvent[] {
  const events: RawEvent[] = [];

  // Split by event rows (each starts with <tr itemscope)
  const rowRe = /<tr\s+itemscope\s+itemtype="https:\/\/schema\.org\/BroadcastEvent">([\s\S]*?)(?=<tr\s+itemscope|<\/table>)/gi;
  let match;

  while ((match = rowRe.exec(html)) !== null) {
    const block = match[1];

    // Extract UTC start time from schema meta
    const startDateMatch = block.match(/<meta\s+itemprop="startDate"\s+content="([^"]+)"/);
    if (!startDateMatch) continue;
    const utcTime = startDateMatch[1];

    // Filter by target date (in Madrid timezone)
    const madridDate = toMadridDate(utcTime);
    if (madridDate !== targetDate) continue;

    const time = toMadridTime(utcTime);

    // Extract competition from description meta
    const descMatch = block.match(/<meta\s+itemprop="description"\s+content="([^"]+)"/);
    if (!descMatch) continue;
    const compRaw = he.decode(descMatch[1]).trim();

    const compConfig = WTM_COMPETITION_MAP[compRaw];
    if (!compConfig) continue;

    // Extract team names from fixture-details content attribute (format: "Team-A v Team-B")
    const fixtureMatch = block.match(/<td\s+class="fixture-details"\s+itemprop="name"\s+content="([^"]+)"/);
    if (!fixtureMatch) continue;
    const fixtureContent = he.decode(fixtureMatch[1]);

    // Split on " v " to get home/away teams
    const teams = fixtureContent.split(' v ');
    if (teams.length < 2) continue; // Not a vs match (e.g. "Chinese Grand Prix")

    const homeTeam = { name: teams[0].replace(/-/g, ' ').trim(), badge: '' };
    const awayTeam = { name: teams[1].replace(/-/g, ' ').trim(), badge: '' };

    // Extract channels from channel-details
    const channelMatch = block.match(/<td\s+class="channel-details">([\s\S]*?)(?:<\/td>|<\/div><\/td>)/);
    const channels: string[] = [];
    if (channelMatch) {
      const imgRe = /<img\s+class="lazyload\s+channel"[^>]*title="([^"]+)"/gi;
      let imgMatch;
      while ((imgMatch = imgRe.exec(channelMatch[1])) !== null) {
        const channelName = he.decode(imgMatch[1]);
        if (WTM_EXCLUDE_CHANNELS.has(channelName)) continue;
        // Only include channels we know how to map
        if (WTM_BROADCAST_MAP[channelName]) {
          channels.push(channelName);
        }
      }
    }

    if (channels.length === 0) continue;

    events.push({
      time,
      sport: compConfig.sport,
      competition: compConfig.name,
      compSlug: '', // Not used for WTM events
      homeTeam,
      awayTeam,
      channels,
    });
  }

  console.log(`Parsed ${events.length} events from wheresthematch.com for ${targetDate}`);
  return events;
}

// Maps WTM raw channel names to canonical Channel enum (used by deduplicateChannels in index.ts)
export { WTM_BROADCAST_MAP };
