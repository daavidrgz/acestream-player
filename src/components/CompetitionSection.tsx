import { COMPETITION_ICONS, COMPETITION_COLORS, Competition, type ChannelEntry, type Event } from '@/lib/channels';
import { EventRow } from '@/components/EventRow';

const CORNER_POSITIONS = {
  tl: '-top-[5px] -left-[5px]',
  tr: '-top-[5px] -right-[5px]',
  bl: '-bottom-[5px] -left-[5px]',
  br: '-bottom-[5px] -right-[5px]',
} as const;

function Corner({ position }: { position: keyof typeof CORNER_POSITIONS }) {
  return (
    <span
      className={`absolute size-[11px] z-[1] ${CORNER_POSITIONS[position]}
        before:content-[''] before:absolute before:bg-foreground/30 before:w-full before:h-px before:top-[5px] before:left-0
        after:content-[''] after:absolute after:bg-foreground/30 after:w-px after:h-full after:left-[5px] after:top-0`}
    />
  );
}

function HLine({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`absolute h-px -left-[100vw] -right-[100vw] bg-foreground/7 pointer-events-none overflow-visible ${
        position === 'top' ? 'top-0' : 'bottom-0'
      }`}
    />
  );
}

interface CompetitionSectionProps {
  name: string;
  events: Event[];
  onChannelSelect: (channel: ChannelEntry) => void;
}

export function CompetitionSection({ name, events, onChannelSelect }: CompetitionSectionProps) {
  const competition = name as Competition;
  const keepOriginalColors = competition === Competition.SERIE_A;

  return (
    <div className="relative">
      <HLine position="top" />
      <HLine position="bottom" />
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
      <h2 className="relative flex items-center py-2 justify-center overflow-hidden">
        {COMPETITION_COLORS[competition] && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${COMPETITION_COLORS[competition]}20 0%, ${COMPETITION_COLORS[competition]}0a 40%, transparent 70%)`,
            }}
          />
        )}
        {COMPETITION_ICONS[competition] && (
          <img
            src={COMPETITION_ICONS[competition]}
            alt=""
            className={`relative size-12 shrink-0 object-contain ${keepOriginalColors ? '' : 'brightness-0 dark:invert'}`}
          />
        )}
      </h2>
      <div className="divide-y divide-border border-t border-border">
        {events.map((event, i) => (
          <EventRow
            key={`${event.homeTeam.name}-${event.awayTeam.name}-${i}`}
            event={event}
            onChannelSelect={onChannelSelect}
          />
        ))}
      </div>
    </div>
  );
}
