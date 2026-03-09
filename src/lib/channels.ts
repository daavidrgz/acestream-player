import { z } from 'zod';

/** Canonical competition identifiers. */
export enum Competition {
  LALIGA_EA_SPORTS = 'LaLiga EA Sports',
  LALIGA_HYPERMOTION = 'LaLiga Hypermotion',
  PREMIER_LEAGUE = 'Premier League',
  BUNDESLIGA = 'Bundesliga',
  SERIE_A = 'Serie A',
  LIGUE_1 = 'Ligue 1',
  CHAMPIONS_LEAGUE = 'Champions League',
  EUROPA_LEAGUE = 'Europa League',
  CONFERENCE_LEAGUE = 'Conference League',
  COPA_DEL_REY = 'Copa del Rey',
  SUPERCOPA_ESPANA = 'Supercopa de España',
  PRIMERA_FEDERACION = 'Primera Federación',
  LIGA_F = 'Liga F',
}

/** Canonical channel identifiers. Single source of truth for channel names across the codebase. */
export enum Channel {
  DAZN_1 = 'DAZN 1',
  DAZN_2 = 'DAZN 2',
  DAZN_3 = 'DAZN 3',
  DAZN_4 = 'DAZN 4',
  DAZN_F1 = 'DAZN F1',
  M_LALIGA = 'M+ LaLiga',
  M_LALIGA_2 = 'M+ LaLiga 2',
  M_LIGA_DE_CAMPEONES = 'M+ Liga de Campeones',
  M_LIGA_DE_CAMPEONES_2 = 'M+ Liga de Campeones 2',
  M_LIGA_DE_CAMPEONES_3 = 'M+ Liga de Campeones 3',
  M_LIGA_DE_CAMPEONES_4 = 'M+ Liga de Campeones 4',
  M_DEPORTES = 'M+ Deportes',
  M_DEPORTES_2 = 'M+ Deportes 2',
  MOVISTAR_PLUS = 'Movistar Plus',
  VAMOS = 'Vamos',
  GOL_PLAY = 'Gol Play',
  EUROSPORT_1 = 'Eurosport 1',
  EUROSPORT_2 = 'Eurosport 2',
  TELEDEPORTE = 'Teledeporte',
  LA_1 = 'La 1',
  LA_2 = 'La 2',
  TV3 = 'TV3',
  ETB = 'ETB',
  MEGA = 'Mega',
  LALIGA_TV_BAR = 'LaLiga TV Bar',
  LALIGA_TV_BAR_2 = 'LaLiga TV Bar 2',
  LALIGA_TV_BAR_3 = 'LaLiga TV Bar 3',
}

// --- Zod schemas ---

const streamSchema = z.object({
  name: z.string(),
  id: z.string(),
  resolution: z.enum(['FHD', 'HD']).nullable(),
});

const channelSchema = z.object({
  name: z.enum(Channel),
  streams: z.array(streamSchema),
});

const teamSchema = z.object({
  name: z.string(),
  badge: z.string(),
});

const eventSchema = z.object({
  time: z.string(),
  competition: z.nativeEnum(Competition),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  channels: z.array(channelSchema),
});

export const agendaSchema = z.object({
  generatedAt: z.string(),
  date: z.string(),
  events: z.array(eventSchema),
});

export type Stream = z.infer<typeof streamSchema>;
export type ChannelEntry = z.infer<typeof channelSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Agenda = z.infer<typeof agendaSchema>;

/** Maps canonical channel names → icon paths (relative to public/) */
export const CHANNEL_ICONS: Record<Channel, string> = {
  [Channel.DAZN_1]: '/icons/channels/dazn.svg',
  [Channel.DAZN_2]: '/icons/channels/dazn.svg',
  [Channel.DAZN_3]: '/icons/channels/dazn.svg',
  [Channel.DAZN_4]: '/icons/channels/dazn.svg',
  [Channel.DAZN_F1]: '/icons/channels/dazn.svg',
  [Channel.M_LALIGA]: '/icons/channels/mlaliga.svg',
  [Channel.M_LALIGA_2]: '/icons/channels/mlaliga.svg',
  [Channel.M_LIGA_DE_CAMPEONES]: '/icons/channels/mligadecampeones.svg',
  [Channel.M_LIGA_DE_CAMPEONES_2]: '/icons/channels/mligadecampeones.svg',
  [Channel.M_LIGA_DE_CAMPEONES_3]: '/icons/channels/mligadecampeones.svg',
  [Channel.M_LIGA_DE_CAMPEONES_4]: '/icons/channels/mligadecampeones.svg',
  [Channel.M_DEPORTES]: '/icons/channels/mdeportes.svg',
  [Channel.M_DEPORTES_2]: '/icons/channels/mdeportes.svg',
  [Channel.MOVISTAR_PLUS]: '/icons/channels/movistar.svg',
  [Channel.VAMOS]: '/icons/channels/vamos.svg',
  [Channel.GOL_PLAY]: '/icons/channels/golplay.svg',
  [Channel.EUROSPORT_1]: '/icons/channels/eurosport1.svg',
  [Channel.EUROSPORT_2]: '/icons/channels/eurosport2.svg',
  [Channel.TELEDEPORTE]: '/icons/channels/teledeporte.svg',
  [Channel.LA_1]: '/icons/channels/la1.svg',
  [Channel.LA_2]: '/icons/channels/la2.svg',
  [Channel.TV3]: '/icons/channels/tv3.svg',
  [Channel.ETB]: '/icons/channels/etb.svg',
  [Channel.MEGA]: '/icons/channels/mega.svg',
  [Channel.LALIGA_TV_BAR]: '/icons/channels/laligatvbar.svg',
  [Channel.LALIGA_TV_BAR_2]: '/icons/channels/laligatvbar.svg',
  [Channel.LALIGA_TV_BAR_3]: '/icons/channels/laligatvbar.svg',
};

/** Maps canonical competition names → brand colors */
export const COMPETITION_COLORS: Record<Competition, string> = {
  [Competition.LALIGA_EA_SPORTS]: '#ff4b44',
  [Competition.LALIGA_HYPERMOTION]: '#00a5e3',
  [Competition.PREMIER_LEAGUE]: '#3d195b',
  [Competition.BUNDESLIGA]: '#d20515',
  [Competition.SERIE_A]: '#024494',
  [Competition.LIGUE_1]: '#dae025',
  [Competition.CHAMPIONS_LEAGUE]: '#3b82f6',
  [Competition.EUROPA_LEAGUE]: '#f37321',
  [Competition.CONFERENCE_LEAGUE]: '#19b252',
  [Competition.COPA_DEL_REY]: '#1a3a6b',
  [Competition.SUPERCOPA_ESPANA]: '#d4af37',
  [Competition.PRIMERA_FEDERACION]: '#004b87',
  [Competition.LIGA_F]: '#5f29ff',
};

/** Maps canonical competition names → icon paths (relative to public/) */
export const COMPETITION_ICONS: Record<Competition, string> = {
  [Competition.LALIGA_EA_SPORTS]: '/icons/competitions/laliga.svg',
  [Competition.LALIGA_HYPERMOTION]: '/icons/competitions/laliga-hypermotion.svg',
  [Competition.PREMIER_LEAGUE]: '/icons/competitions/premier-league.svg',
  [Competition.BUNDESLIGA]: '/icons/competitions/bundesliga.svg',
  [Competition.SERIE_A]: '/icons/competitions/serie-a.svg',
  [Competition.LIGUE_1]: '/icons/competitions/ligue-1.svg',
  [Competition.CHAMPIONS_LEAGUE]: '/icons/competitions/champions-league.svg',
  [Competition.EUROPA_LEAGUE]: '/icons/competitions/europa-league.svg',
  [Competition.CONFERENCE_LEAGUE]: '/icons/competitions/conference-league.svg',
  [Competition.COPA_DEL_REY]: '/icons/competitions/copa-del-rey.svg',
  [Competition.SUPERCOPA_ESPANA]: '/icons/competitions/supercopa-espana.svg',
  [Competition.PRIMERA_FEDERACION]: '/icons/competitions/primera-federacion.svg',
  [Competition.LIGA_F]: '/icons/competitions/liga-f.svg',
};
