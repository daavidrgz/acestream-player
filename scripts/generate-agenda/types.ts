export interface AcestreamEntry {
  category: string;
  name: string;
  id: string;
  resolution: 'FHD' | 'HD' | null;
}

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
