import { useState, useEffect } from 'react';
import { Radio, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type Day = 'today' | 'tomorrow';

function useTheme() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, () => setDark((d) => !d)] as const;
}

export function Header({
  date,
  day,
  onDayChange,
}: {
  date?: string;
  day: Day;
  onDayChange: (day: Day) => void;
}) {
  const [dark, toggleTheme] = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-background/90">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Radio className="size-5" />
          AceStream Player
        </h1>
        <div className="flex items-center gap-3">
          {date && (
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          )}
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[day]}
            onValueChange={(values) => {
              const next = values[0] as Day | undefined;
              if (next) onDayChange(next);
            }}
          >
            <ToggleGroupItem value="today" className="text-xs">
              Today
            </ToggleGroupItem>
            <ToggleGroupItem value="tomorrow" className="text-xs">
              Tomorrow
            </ToggleGroupItem>
          </ToggleGroup>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute bottom-0 h-px -left-[100vw] -right-[100vw] bg-foreground/7 pointer-events-none" />
      </div>
    </header>
  );
}
