import { z } from 'zod';

/** Canonical sport identifiers. */
export enum Sport {
  FOOTBALL = 'football',
  TENNIS = 'tennis',
  BASKETBALL = 'basketball',
}

/** Canonical competition identifiers. */
export enum Competition {
  // Football
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
  // Tennis – Grand Slams
  ROLAND_GARROS = 'Roland Garros',
  WIMBLEDON = 'Wimbledon',
  // Tennis – ATP
  ATP_MASTERS_1000 = 'ATP Masters 1000',
  ATP_500 = 'ATP 500',
  ATP_250 = 'ATP 250',
  ATP_FINALS = 'ATP Finals',
  // Tennis – WTA
  WTA_1000 = 'WTA 1000',
  WTA_500 = 'WTA 500',
  WTA_250 = 'WTA 250',
  // Tennis – Other
  LAVER_CUP = 'Laver Cup',
  BJK_CUP = 'Billie Jean King Cup',
  // Basketball
  LIGA_ENDESA = 'Liga Endesa',
  EUROLEAGUE = 'EuroLeague',
  NBA = 'NBA',
  BASKETBALL_CHAMPIONS_LEAGUE = 'Basketball Champions League',
  PRIMERA_FEB = 'Primera FEB',
  LIGA_FEMENINA_BALONCESTO = 'Liga Femenina',
  FIBA_EUROPE_CUP = 'FIBA Europe Cup',
}

/** Canonical channel identifiers. Single source of truth for channel names across the codebase. */
export enum Channel {
  DAZN_1 = 'DAZN 1',
  DAZN_2 = 'DAZN 2',
  DAZN_3 = 'DAZN 3',
  DAZN_4 = 'DAZN 4',
  DAZN_F1 = 'DAZN F1',
  DAZN_LALIGA_1 = 'DAZN LaLiga 1',
  DAZN_LALIGA_2 = 'DAZN LaLiga 2',
  DAZN_1_BAR = 'DAZN 1 Bar',
  DAZN_2_BAR = 'DAZN 2 Bar',
  M_LALIGA = 'M+ LaLiga 1',
  M_LALIGA_2 = 'M+ LaLiga 2',
  M_LIGA_DE_CAMPEONES = 'M+ Liga de Campeones 1',
  M_LIGA_DE_CAMPEONES_2 = 'M+ Liga de Campeones 2',
  M_LIGA_DE_CAMPEONES_3 = 'M+ Liga de Campeones 3',
  M_LIGA_DE_CAMPEONES_4 = 'M+ Liga de Campeones 4',
  M_DEPORTES = 'M+ Deportes',
  M_DEPORTES_2 = 'M+ Deportes 2',
  MOVISTAR_PLUS = 'Movistar Plus',
  VAMOS = 'M+ #Vamos',
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
  HYPERMOTION = 'Hypermotion',
  HYPERMOTION_2 = 'Hypermotion 2',
  HYPERMOTION_3 = 'Hypermotion 3',
  M_DEPORTES_3 = 'M+ Deportes 3',
  VAMOS_BAR = 'M+ #Vamos Bar',
  DAZN_BALONCESTO = 'DAZN Baloncesto',
  // UK channels
  SKY_SPORTS_MAIN_EVENT = 'Sky Sports Main Event',
  SKY_SPORTS_FOOTBALL = 'Sky Sports Football',
  SKY_SPORTS_PREMIER_LEAGUE = 'Sky Sports Premier League',
  SKY_SPORTS_ACTION = 'Sky Sports Action',
  SKY_SPORTS_TENNIS = 'Sky Sports Tennis',
  SKY_SPORTS_GOLF = 'Sky Sports Golf',
  SKY_SPORTS_F1 = 'Sky Sports F1',
  SKY_SPORTS_CRICKET = 'Sky Sports Cricket',
  SKY_SPORTS_MIX = 'Sky Sports Mix',
  SKY_SPORTS_ARENA = 'Sky Sports Arena',
  TNT_SPORTS_1 = 'TNT Sports 1',
  TNT_SPORTS_2 = 'TNT Sports 2',
  TNT_SPORTS_3 = 'TNT Sports 3',
  TNT_SPORTS_4 = 'TNT Sports 4',
  PREMIER_SPORTS_1 = 'Premier Sports 1',
  PREMIER_SPORTS_2 = 'Premier Sports 2',
  BBC_ONE = 'BBC One',
  ITV_1 = 'ITV 1',
  ITV_4 = 'ITV 4',
  // International channels
  BEIN_SPORTS_1 = 'beIN Sports 1',
  BEIN_SPORTS_2 = 'beIN Sports 2',
  BEIN_SPORTS_3 = 'beIN Sports 3',
  ESPN = 'ESPN',
  ESPN_2 = 'ESPN 2',
  FOX_SPORTS_1 = 'FOX Sports 1',
  FOX_SPORTS_2 = 'FOX Sports 2',
  // US channels
  ABC = 'ABC',
  NBC = 'NBC',
  CBS_SPORTS = 'CBS Sports',
  USA_NETWORK = 'USA Network',
  NBA_TV = 'NBA TV',
}

// --- Zod schemas ---

const streamSchema = z.object({
  name: z.string(),
  id: z.string(),
  resolution: z.enum(['FHD', 'HD']),
  recommended: z.boolean().optional(),
});

const channelSchema = z.object({
  name: z.enum(Channel),
  streams: z.array(streamSchema),
});

const teamSchema = z.object({
  name: z.string(),
  badge: z.string(),
});

const sportSchema = z.nativeEnum(Sport);

const eventSchema = z.object({
  time: z.string(),
  sport: sportSchema,
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
  [Channel.DAZN_LALIGA_1]: '/icons/channels/dazn.svg',
  [Channel.DAZN_LALIGA_2]: '/icons/channels/dazn.svg',
  [Channel.DAZN_1_BAR]: '/icons/channels/dazn.svg',
  [Channel.DAZN_2_BAR]: '/icons/channels/dazn.svg',
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
  [Channel.HYPERMOTION]: '/icons/channels/laligatvbar.svg',
  [Channel.HYPERMOTION_2]: '/icons/channels/laligatvbar.svg',
  [Channel.HYPERMOTION_3]: '/icons/channels/laligatvbar.svg',
  [Channel.M_DEPORTES_3]: '/icons/channels/mdeportes.svg',
  [Channel.VAMOS_BAR]: '/icons/channels/vamos.svg',
  [Channel.DAZN_BALONCESTO]: '/icons/channels/dazn.svg',
  // UK channels
  [Channel.SKY_SPORTS_MAIN_EVENT]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_FOOTBALL]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_PREMIER_LEAGUE]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_ACTION]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_TENNIS]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_GOLF]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_F1]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_CRICKET]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_MIX]: '/icons/channels/sky-sports.svg',
  [Channel.SKY_SPORTS_ARENA]: '/icons/channels/sky-sports.svg',
  [Channel.TNT_SPORTS_1]: '/icons/channels/tnt-sports.svg',
  [Channel.TNT_SPORTS_2]: '/icons/channels/tnt-sports.svg',
  [Channel.TNT_SPORTS_3]: '/icons/channels/tnt-sports.svg',
  [Channel.TNT_SPORTS_4]: '/icons/channels/tnt-sports.svg',
  [Channel.PREMIER_SPORTS_1]: '/icons/channels/premier-sports.svg',
  [Channel.PREMIER_SPORTS_2]: '/icons/channels/premier-sports.svg',
  [Channel.BBC_ONE]: '/icons/channels/bbc.svg',
  [Channel.ITV_1]: '/icons/channels/itv.svg',
  [Channel.ITV_4]: '/icons/channels/itv.svg',
  // International channels
  [Channel.BEIN_SPORTS_1]: '/icons/channels/bein-sports.svg',
  [Channel.BEIN_SPORTS_2]: '/icons/channels/bein-sports.svg',
  [Channel.BEIN_SPORTS_3]: '/icons/channels/bein-sports.svg',
  [Channel.ESPN]: '/icons/channels/espn.svg',
  [Channel.ESPN_2]: '/icons/channels/espn.svg',
  [Channel.FOX_SPORTS_1]: '/icons/channels/fox-sports.svg',
  [Channel.FOX_SPORTS_2]: '/icons/channels/fox-sports.svg',
  // US channels
  [Channel.ABC]: '/icons/channels/abc.svg',
  [Channel.NBC]: '/icons/channels/nbc.svg',
  [Channel.CBS_SPORTS]: '/icons/channels/cbs-sports.svg',
  [Channel.USA_NETWORK]: '/icons/channels/usa-network.svg',
  [Channel.NBA_TV]: '/icons/channels/nba-tv.svg',
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
  // Tennis
  [Competition.ROLAND_GARROS]: '#d35400',
  [Competition.WIMBLEDON]: '#006633',
  [Competition.ATP_MASTERS_1000]: '#c9a84c',
  [Competition.ATP_500]: '#0c2340',
  [Competition.ATP_250]: '#0c2340',
  [Competition.ATP_FINALS]: '#e4002b',
  [Competition.WTA_1000]: '#6a1b9a',
  [Competition.WTA_500]: '#6a1b9a',
  [Competition.WTA_250]: '#6a1b9a',
  [Competition.LAVER_CUP]: '#1a1a1a',
  [Competition.BJK_CUP]: '#00a651',
  // Basketball
  [Competition.LIGA_ENDESA]: '#ff6600',
  [Competition.EUROLEAGUE]: '#f47321',
  [Competition.NBA]: '#1d428a',
  [Competition.BASKETBALL_CHAMPIONS_LEAGUE]: '#ff8200',
  [Competition.PRIMERA_FEB]: '#003da5',
  [Competition.LIGA_FEMENINA_BALONCESTO]: '#e91e63',
  [Competition.FIBA_EUROPE_CUP]: '#003da5',
};

export type BadgeStyle = 'logo' | 'headshot';

export const SPORT_BADGE_CONFIG: Record<Sport, { badgeStyle: BadgeStyle }> = {
  [Sport.FOOTBALL]: { badgeStyle: 'logo' },
  [Sport.TENNIS]:   { badgeStyle: 'headshot' },
  [Sport.BASKETBALL]: { badgeStyle: 'logo' },
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
  // Tennis
  [Competition.ROLAND_GARROS]: '/icons/competitions/roland-garros.svg',
  [Competition.WIMBLEDON]: '/icons/competitions/wimbledon.svg',
  [Competition.ATP_MASTERS_1000]: '/icons/competitions/atp-masters-1000.svg',
  [Competition.ATP_500]: '/icons/competitions/atp.svg',
  [Competition.ATP_250]: '/icons/competitions/atp.svg',
  [Competition.ATP_FINALS]: '/icons/competitions/atp.svg',
  [Competition.WTA_1000]: '/icons/competitions/wta.svg',
  [Competition.WTA_500]: '/icons/competitions/wta.svg',
  [Competition.WTA_250]: '/icons/competitions/wta.svg',
  [Competition.LAVER_CUP]: '/icons/competitions/laver-cup.svg',
  [Competition.BJK_CUP]: '/icons/competitions/bjk-cup.svg',
  // Basketball
  [Competition.LIGA_ENDESA]: '/icons/competitions/liga-endesa.svg',
  [Competition.EUROLEAGUE]: '/icons/competitions/euroleague.svg',
  [Competition.NBA]: '/icons/competitions/nba.svg',
  [Competition.BASKETBALL_CHAMPIONS_LEAGUE]: '/icons/competitions/basketball-champions-league.svg',
  [Competition.PRIMERA_FEB]: '/icons/competitions/primera-feb.svg',
  [Competition.LIGA_FEMENINA_BALONCESTO]: '/icons/competitions/liga-femenina-baloncesto.svg',
  [Competition.FIBA_EUROPE_CUP]: '/icons/competitions/fiba-europe-cup.svg',
};

/** Optional width override (Tailwind class) for wide/horizontal logos. Default is `size-12`. */
export const COMPETITION_ICON_SIZE: Partial<Record<Competition, string>> = {
  [Competition.BUNDESLIGA]: 'w-24',
  [Competition.WTA_1000]: 'w-24',
  [Competition.WTA_500]: 'w-24',
  [Competition.WTA_250]: 'w-24',
  [Competition.BJK_CUP]: 'w-24',
  [Competition.EUROLEAGUE]: 'w-24',
  [Competition.NBA]: 'w-24',
};
