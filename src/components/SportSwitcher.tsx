import { Volleyball, CircleDot, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sport } from '@/lib/channels';

const SPORTS: { value: Sport; label: string; icon: LucideIcon }[] = [
  { value: Sport.FOOTBALL, label: 'Football', icon: Volleyball },
  { value: Sport.TENNIS, label: 'Tennis', icon: CircleDot },
  { value: Sport.BASKETBALL, label: 'Basketball', icon: Trophy },
];

export function SportSwitcher({
  value,
  onChange,
}: {
  value: Sport;
  onChange: (sport: Sport) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 px-6 pt-3">
      {SPORTS.map(({ value: sport, label, icon: Icon }) => (
        <button
          key={sport}
          onClick={() => onChange(sport)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            sport === value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
