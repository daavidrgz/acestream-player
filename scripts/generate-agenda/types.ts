import type { Sport } from '../../src/lib/channels';

export interface RawEvent {
  time: string;
  sport: Sport;
  competition: string;
  compSlug: string;
  homeTeam: { name: string; badge: string };
  awayTeam: { name: string; badge: string };
  channels: string[];
}

export interface EspnEntry {
  logo: string;
}
