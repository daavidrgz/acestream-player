import { cn } from '@/lib/utils';
import type { AcestreamStatus } from '@/lib/useLocalAcestream';

const STATUS_CONFIG: Record<AcestreamStatus, { dot: string; label: string; bg: string }> = {
  checking:     { dot: 'bg-yellow-400 animate-pulse', label: 'Checking...', bg: 'border-yellow-500/30' },
  connected:    { dot: 'bg-green-500',                label: 'Local Acestream',  bg: 'border-green-500/30' },
  disconnected: { dot: 'bg-red-500',                  label: 'No local engine',  bg: 'border-red-500/30' },
};

export function LocalAcestreamBadge({
  status,
  onClick,
}: {
  status: AcestreamStatus;
  onClick?: () => void;
}) {
  const cfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs backdrop-blur-sm transition-all hover:bg-secondary/60',
        cfg.bg,
        'cursor-pointer',
      )}
    >
      <img src="/icons/acestream.svg" alt="" className="size-4" />
      <span className={cn('size-2 rounded-full', cfg.dot)} />
      <span className="text-muted-foreground">{cfg.label}</span>
    </button>
  );
}
