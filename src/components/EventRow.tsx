import { Tv, Clock, User } from 'lucide-react';
import { CHANNEL_ICONS, SPORT_BADGE_CONFIG, type BadgeStyle, type ChannelEntry, type Team, type Event } from '@/lib/channels';

function TeamBadge({ team, reverse, badgeStyle }: { team: Team; reverse?: boolean; badgeStyle: BadgeStyle }) {
  const isHeadshot = badgeStyle === 'headshot';
  return (
    <div className={`flex items-center gap-2 min-w-0 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      {team.badge ? (
        <img
          src={team.badge}
          alt={team.name}
          className={`shrink-0 object-contain ${isHeadshot ? 'size-11 relative -top-2' : 'size-7'}`}
          loading="lazy"
        />
      ) : isHeadshot ? (
        <div className="size-11 shrink-0 rounded-full bg-muted flex items-center justify-center relative -top-2">
          <User className="size-6 text-muted-foreground" />
        </div>
      ) : (
        <div className="size-7 shrink-0 rounded-full bg-muted" />
      )}
      <span className="truncate text-sm font-medium">{team.name}</span>
    </div>
  );
}

function ChannelPill({ channel, onSelect }: { channel: ChannelEntry; onSelect: (channel: ChannelEntry) => void }) {
  const hasStreams = channel.streams.length > 0;
  const icon = CHANNEL_ICONS[channel.name];

  return (
    <button
      onClick={() => hasStreams && onSelect(channel)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
        hasStreams
          ? 'border-primary/20 bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80'
          : 'border-border bg-muted/50 text-muted-foreground cursor-default'
      }`}
    >
      {icon ? (
        <img src={icon} alt="" className="size-4 shrink-0" />
      ) : (
        <Tv className="size-3 shrink-0" />
      )}
      <span className="truncate">{channel.name}</span>
    </button>
  );
}

export function EventRow({ event, onChannelSelect }: { event: Event; onChannelSelect: (channel: ChannelEntry) => void }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-1">
        <Clock className="size-3 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{event.time}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBadge team={event.homeTeam} reverse badgeStyle={SPORT_BADGE_CONFIG[event.sport].badgeStyle} />
        <span className="text-xxs font-bold text-foreground">VS</span>
        <TeamBadge team={event.awayTeam} badgeStyle={SPORT_BADGE_CONFIG[event.sport].badgeStyle} />
      </div>

      {event.channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.channels.map((ch) => (
            <ChannelPill key={ch.name} channel={ch} onSelect={onChannelSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
