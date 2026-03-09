import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChannelEntry, Stream } from '@/lib/channels';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ProviderGroup {
  provider: string;
  resolution: string | null;
  streams: Stream[];
}

function parseProvider(name: string): string {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : 'Unknown';
}

function groupStreams(streams: Stream[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>();

  for (const stream of streams) {
    const provider = parseProvider(stream.name);
    const key = `${provider}::${stream.resolution ?? ''}`;

    if (!map.has(key)) {
      map.set(key, { provider, resolution: stream.resolution, streams: [] });
    }
    map.get(key)!.streams.push(stream);
  }

  // Sort: FHD first, then HD, then null; within same resolution, alphabetical by provider
  const resOrder = (r: string | null) => r === 'FHD' ? 0 : r === 'HD' ? 1 : 2;
  return [...map.values()].sort((a, b) => {
    const rd = resOrder(a.resolution) - resOrder(b.resolution);
    if (rd !== 0) return rd;
    return a.provider.localeCompare(b.provider);
  });
}

const resolutionColors: Record<string, string> = {
  FHD: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  HD: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
};

export function StreamDialog({
  channel,
  open,
  onClose,
  onSelect,
}: {
  channel: ChannelEntry | null;
  open: boolean;
  onClose: () => void;
  onSelect: (stream: Stream) => void;
}) {
  const groups = useMemo(
    () => (channel ? groupStreams(channel.streams) : []),
    [channel],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[80dvh] flex-col overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-0">
          <DialogTitle>Select a stream</DialogTitle>
          <DialogDescription>{channel?.name}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain px-2 pb-2">
          {groups.map((group) => (
            <div key={`${group.provider}-${group.resolution}`} className="mt-1 first:mt-0">
              {/* Provider header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.provider}
                </span>
                {group.resolution && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 h-4 font-semibold',
                      resolutionColors[group.resolution],
                    )}
                  >
                    {group.resolution}
                  </Badge>
                )}
                {!group.resolution && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 h-4 font-semibold bg-muted/50 text-muted-foreground border-border"
                  >
                    SD
                  </Badge>
                )}
              </div>

              {/* Stream rows */}
              <div className="flex flex-col gap-px">
                {group.streams.map((stream, i) => (
                  <button
                    key={stream.id}
                    type="button"
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      'hover:bg-secondary/60 active:bg-secondary/80',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    )}
                    onClick={() => onSelect(stream)}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary/80 text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </div>
                    <span className="text-foreground/90">
                      {group.streams.length > 1
                        ? `Option ${i + 1}`
                        : 'Option'}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground/50">
                      {stream.id.slice(0, 6)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
