export interface RawEvent {
  time: string;
  competition: string;
  compSlug: string;
  homeTeam: { name: string; badge: string };
  awayTeam: { name: string; badge: string };
  channels: string[];
}

export interface EspnEntry {
  logo: string;
}
