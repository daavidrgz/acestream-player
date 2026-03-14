import { Volleyball, CircleDot, Hand, Swords, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Sport = 'football' | 'tennis' | 'handball' | 'mma';

const SPORTS: { value: Sport; label: string; icon: LucideIcon }[] = [
  { value: 'football', label: 'Football', icon: Volleyball },
  { value: 'tennis', label: 'Tennis', icon: CircleDot },
  { value: 'handball', label: 'Handball', icon: Hand },
  { value: 'mma', label: 'MMA', icon: Swords },
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
