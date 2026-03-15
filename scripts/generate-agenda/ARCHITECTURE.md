# Generate Agenda — Architecture

This document describes the broadcast data pipeline that generates
`data/agenda.json` and `data/agenda-tomorrow.json`.

## Overview

The pipeline aggregates sports broadcast schedules from **three independent
sources**, merges them into a unified event list, enriches events with team
badges/headshots, and attaches available acestream links.

```
Sources                  Merge                    Enrich              Output
┌──────────────┐
│ futbolenlatv  │──(primary)──┐
│  (Spain)      │             │
└──────────────┘             ▼
┌──────────────┐      ┌───────────┐      ┌─────────────┐     ┌────────────┐
│wheresthematch│──────│  merge    │─────▶│  badges +   │────▶│ agenda.json│
│   (UK)       │      │  events   │      │  acestreams  │     │ agenda-    │
└──────────────┘      └───────────┘      └─────────────┘     │ tomorrow   │
┌──────────────┐             ▲                                └────────────┘
│ESPN scoreboard│─(tertiary)─┘
│   (US)        │
└──────────────┘
```

## Data Sources

### 1. futbolenlatv.es — Spanish broadcasts (primary)

- **URL**: `https://www.futbolenlatv.es/` + sport sub-pages (`/deporte/tenis`,
  `/deporte/baloncesto`)
- **Coverage**: Spanish TV channels (DAZN, Movistar+, La 1, TV3, ETB, etc.)
- **Sports**: Football, Tennis, Basketball
- **Parsing**: HTML scraping with regex. Events for "today" and "tomorrow" are
  extracted from the same page using day headers (`hoy` / `mañana`).
- **Channel mapping**: `BROADCAST_MAP` in `index.ts` maps raw lowercased
  channel names to the canonical `Channel` enum.

### 2. wheresthematch.com — UK broadcasts (secondary)

- **URL**: `https://www.wheresthematch.com/live-sport-on-tv/`
- **Coverage**: UK TV channels (Sky Sports, TNT Sports, BBC, ITV, etc.)
- **Sports**: Football, Basketball, Tennis
- **Parsing**: HTML scraping with regex against `schema.org/BroadcastEvent`
  markup. Times are converted from UTC to Europe/Madrid timezone.
- **Channel mapping**: `WTM_BROADCAST_MAP` in `wheresthematch.ts`.
- **Module**: `wheresthematch.ts`

### 3. ESPN Scoreboard API — US broadcasts (tertiary)

- **URL pattern**:
  `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD`
- **Coverage**: US TV channels (ESPN, ABC, NBC, CBS Sports, USA Network, NBA TV,
  FOX Sports, etc.). Only US-region broadcasts; no international channels.
- **Sports**: Football (soccer leagues), Basketball (NBA)
- **Parsing**: JSON API. Events are filtered by target date in Madrid timezone.
  Only events with at least one mapped TV channel are included.
- **Channel mapping**: `ESPN_BROADCAST_MAP` in `espn-scoreboard.ts`.
- **Excluded**: Streaming-only services (ESPN+, Peacock, Prime Video, etc.)
- **Module**: `espn-scoreboard.ts`

## Merge Strategy

Events from the three sources are merged in two passes:

```
merged = merge(merge(futbolenlatv, wheresthematch), espn)
```

The `mergeEvents(primary, secondary)` function works as follows:

1. **Exact key match**: Events are keyed by
   `{competition}|{normalizedHome}|{normalizedAway}`. If two events share the
   same key, their channel lists are merged (union).

2. **Fuzzy match**: If no exact key match is found, the function looks for a
   candidate in the same competition where both team names match via substring
   inclusion (e.g., "Verona" matches "Hellas Verona").

3. **New event**: If neither match succeeds, the secondary event is added as a
   new entry. This means ESPN or wheresthematch can surface events that
   futbolenlatv doesn't list.

Team name normalization strips accents, removes common affiliation suffixes
(FC, CF, CD, etc.), and applies a curated alias map (`MERGE_ALIASES`).

## Channel Resolution

When building the final output, `deduplicateChannels()` resolves raw channel
names from any source to the canonical `Channel` enum. It checks three maps
in order:

1. `BROADCAST_MAP` — futbolenlatv names (lowercased)
2. `WTM_BROADCAST_MAP` — wheresthematch names (case-sensitive)
3. `ESPN_BROADCAST_MAP` — ESPN names (case-sensitive)

Each resolved channel is paired with any matching acestream streams from
`classifiedStreams`.

## Acestream Classification

The `classifyAcestreams()` function maps raw acestream stream names to
canonical channels using `ACESTREAM_PATTERNS` — an ordered list of
`[RegExp, Channel]` pairs. More specific patterns come first (e.g.,
"DAZN Baloncesto" before "DAZN"). Non-Spanish regional streams
(`[DE]`, `[IT]`, `[FR]`, `[PT]`) are filtered out.

## Badge Enrichment

Team logos and player headshots are fetched from external APIs:

- **Football**: ESPN Teams API (`/sports/soccer/{league}/teams`) — team crests
- **Basketball**: EuroLeague API (`api-live.euroleague.net/v2/clubs`) + ESPN
  Teams API — combined for European + American teams
- **Tennis**: ESPN Rankings API (`/sports/tennis/{league}/rankings`) — player
  headshots

Badge lookup uses normalized name matching with substring fallback.

## Competition Configuration

Three config maps control which competitions are included:

| Config | File | Scope |
|--------|------|-------|
| `COMPETITION_CONFIG` | `index.ts` | Football — maps futbolenlatv slugs to `Competition` + optional ESPN league code |
| `TENNIS_COMPETITION_CONFIG` | `index.ts` | Tennis — maps futbolenlatv slugs to `Competition` |
| `BASKETBALL_COMPETITION_CONFIG` | `index.ts` | Basketball — maps futbolenlatv slugs to `Competition` + optional ESPN league code |
| `ESPN_SCOREBOARD_LEAGUES` | `espn-scoreboard.ts` | ESPN scoreboard — maps ESPN sport/league pairs to `Competition` + `Sport` |

The `COMPETITION_ESPN_CODES` reverse map is built at startup for badge lookups
from any source.

## Output

Two JSON files are written, validated against `agendaSchema` (Zod):

- `data/agenda.json` — today's events
- `data/agenda-tomorrow.json` — tomorrow's events

### Schema

```typescript
interface Agenda {
  generatedAt: string;  // ISO timestamp
  date: string;         // YYYY-MM-DD
  events: Event[];
}

interface Event {
  time: string;              // HH:MM (Madrid timezone)
  sport: Sport;              // 'football' | 'tennis' | 'basketball'
  competition: Competition;  // e.g. 'LaLiga EA Sports', 'NBA'
  homeTeam: Team;
  awayTeam: Team;
  channels: ChannelEntry[];
}

interface ChannelEntry {
  name: Channel;       // Canonical channel name
  streams: Stream[];   // Available acestream links
}

interface Stream {
  name: string;
  id: string;                // Acestream content ID
  resolution: 'FHD' | 'HD';
  recommended?: boolean;
}
```

## File Map

```
scripts/generate-agenda/
├── index.ts              # Main pipeline: fetch, parse, merge, build, output
├── wheresthematch.ts     # UK broadcast scraper
├── espn-scoreboard.ts    # US broadcast scraper (ESPN Scoreboard API)
├── types.ts              # Shared types (RawEvent, EspnEntry)
└── ARCHITECTURE.md       # This file

src/lib/
└── channels.ts           # Channel, Competition, Sport enums + Zod schemas

data/
├── agenda.json           # Output: today's schedule
├── agenda-tomorrow.json  # Output: tomorrow's schedule
└── acestream-channels.json  # Input: scraped acestream streams
```

## Adding a New Source

To add a fourth broadcast source:

1. Create a new module (e.g., `new-source.ts`) exporting:
   - A scraper function returning `Promise<RawEvent[]>`
   - A broadcast map (`Record<string, Channel>`) for channel name resolution
2. Add any new channels to `Channel` enum in `src/lib/channels.ts` (plus icons)
3. Add acestream patterns for new channels in `ACESTREAM_PATTERNS` (`index.ts`)
4. Import and call the scraper in `main()`, add it to the `Promise.all`
5. Chain another `mergeEvents()` call with the new source
6. Add the broadcast map to the fallback chain in `deduplicateChannels()`

## Adding a New Sport

1. Add the sport to `Sport` enum in `src/lib/channels.ts`
2. Add competitions to `Competition` enum
3. Create a competition config map in `index.ts`
4. If the sport exists on ESPN, add entries to `ESPN_SCOREBOARD_LEAGUES`
5. Add a parser function (HTML scraping) or extend the ESPN scraper
6. Add badge fetching logic if needed
