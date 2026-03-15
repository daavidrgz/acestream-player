import { Channel, Competition, Sport } from '../../src/lib/channels';
import type { RawEvent } from './types';

// Maps ESPN broadcast channel names → canonical Channel enum.
// Only TV channels — streaming-only services are excluded.
const ESPN_BROADCAST_MAP: Record<string, Channel> = {
  'ESPN': Channel.ESPN,
  'ESPN2': Channel.ESPN_2,
  'ESPN 2': Channel.ESPN_2,
  'ABC': Channel.ABC,
  'NBC': Channel.NBC,
  'NBCSN': Channel.NBC,
  'CBS Sports Network': Channel.CBS_SPORTS,
  'CBS': Channel.CBS_SPORTS,
  'USA Network': Channel.USA_NETWORK,
  'USA Net': Channel.USA_NETWORK,
  'NBA TV': Channel.NBA_TV,
  'FOX': Channel.FOX_SPORTS_1,
  'FS1': Channel.FOX_SPORTS_1,
  'FS2': Channel.FOX_SPORTS_2,
  'FOX Sports 1': Channel.FOX_SPORTS_1,
  'FOX Sports 2': Channel.FOX_SPORTS_2,
  'Tele': Channel.NBC, // Telemundo — mapped to NBC (same parent network)
};

// Streaming-only services to skip.
const ESPN_EXCLUDE_CHANNELS = new Set([
  'ESPN+', 'ESPN Deportes', 'Peacock', 'Peacock Premium',
  'Prime Video', 'fuboTV', 'Paramount+', 'Apple TV+', 'Apple TV',
  'NBA League Pass', 'ESPN App', 'ESPN3',
]);

// ESPN scoreboard league configs: maps ESPN sport+league → Competition + Sport.
// Built from the existing COMPETITION_CONFIG and BASKETBALL_COMPETITION_CONFIG espn codes.
interface EspnLeagueConfig {
  espnSport: string;   // ESPN sport path segment (e.g. 'soccer', 'basketball')
  espnLeague: string;  // ESPN league code (e.g. 'eng.1', 'nba')
  competition: Competition;
  sport: Sport;
}

const ESPN_SCOREBOARD_LEAGUES: EspnLeagueConfig[] = [
  // Football (soccer)
  { espnSport: 'soccer', espnLeague: 'esp.1', competition: Competition.LALIGA_EA_SPORTS, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'esp.2', competition: Competition.LALIGA_HYPERMOTION, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'eng.1', competition: Competition.PREMIER_LEAGUE, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'ger.1', competition: Competition.BUNDESLIGA, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'ita.1', competition: Competition.SERIE_A, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'fra.1', competition: Competition.LIGUE_1, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'uefa.champions', competition: Competition.CHAMPIONS_LEAGUE, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'uefa.europa', competition: Competition.EUROPA_LEAGUE, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'uefa.europa.conf', competition: Competition.CONFERENCE_LEAGUE, sport: Sport.FOOTBALL },
  { espnSport: 'soccer', espnLeague: 'esp.copa_del_rey', competition: Competition.COPA_DEL_REY, sport: Sport.FOOTBALL },
  // Basketball
  { espnSport: 'basketball', espnLeague: 'nba', competition: Competition.NBA, sport: Sport.BASKETBALL },
];

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

/**
 * Fetches ESPN scoreboard data for all configured leagues on a given date.
 * Returns RawEvent[] with US broadcast channels.
 */
export async function scrapeEspnScoreboard(targetDate: string): Promise<RawEvent[]> {
  const dateParam = targetDate.replace(/-/g, '');
  const events: RawEvent[] = [];

  console.log(`Fetching ESPN scoreboard for ${targetDate}...`);

  const results = await Promise.all(
    ESPN_SCOREBOARD_LEAGUES.map(async (cfg) => {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.espnLeague}/scoreboard?dates=${dateParam}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return parseEspnEvents(data, cfg, targetDate);
      } catch (err: unknown) {
        console.warn(`Failed to fetch ESPN scoreboard for ${cfg.espnLeague}: ${(err as Error).message}`);
        return [];
      }
    }),
  );

  for (const batch of results) {
    events.push(...batch);
  }

  console.log(`Parsed ${events.length} events from ESPN scoreboard for ${targetDate}`);
  return events;
}

function parseEspnEvents(
  data: { events?: EspnScoreboardEvent[] },
  cfg: EspnLeagueConfig,
  targetDate: string,
): RawEvent[] {
  const events: RawEvent[] = [];
  if (!data.events) return events;

  for (const event of data.events) {
    // Filter by target date in Madrid timezone
    if (!event.date) continue;
    const madridDate = toMadridDate(event.date);
    if (madridDate !== targetDate) continue;

    const time = toMadridTime(event.date);
    const competition = event.competitions?.[0];
    if (!competition) continue;

    // Extract teams
    const competitors = competition.competitors || [];
    const homeComp = competitors.find((c: EspnCompetitor) => c.homeAway === 'home');
    const awayComp = competitors.find((c: EspnCompetitor) => c.homeAway === 'away');
    if (!homeComp?.team?.displayName || !awayComp?.team?.displayName) continue;

    // Extract broadcast channels
    const channels: string[] = [];
    const broadcasts = competition.broadcasts || [];
    for (const broadcast of broadcasts) {
      for (const name of broadcast.names || []) {
        if (ESPN_EXCLUDE_CHANNELS.has(name)) continue;
        if (ESPN_BROADCAST_MAP[name]) {
          channels.push(name);
        }
      }
    }

    if (channels.length === 0) continue;

    events.push({
      time,
      sport: cfg.sport,
      competition: cfg.competition,
      compSlug: '', // Not used for ESPN events
      homeTeam: { name: homeComp.team.displayName, badge: '' },
      awayTeam: { name: awayComp.team.displayName, badge: '' },
      channels,
    });
  }

  return events;
}

// ESPN scoreboard API types (minimal subset)
interface EspnScoreboardEvent {
  date: string;
  competitions?: {
    competitors?: EspnCompetitor[];
    broadcasts?: { market: string; names: string[] }[];
  }[];
}

interface EspnCompetitor {
  homeAway: string;
  team: { displayName: string; shortDisplayName?: string };
}

// Export for use in deduplicateChannels
export { ESPN_BROADCAST_MAP };
