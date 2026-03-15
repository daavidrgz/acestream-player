import { useMemo, useState } from 'react';
import { Star, List, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelEntry, Stream } from '@/lib/channels';
import { CHANNEL_ICONS } from '@/lib/channels';
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
  streams: Stream[];
}

function parseProvider(name: string): string {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : 'Unknown';
}

const resOrder = (r: string | null) => r === 'FHD' ? 0 : r === 'HD' ? 1 : 2;

function groupStreams(streams: Stream[]): ProviderGroup[] {
  const map = new Map<string, ProviderGroup>();

  for (const stream of streams) {
    const provider = parseProvider(stream.name);

    if (!map.has(provider)) {
      map.set(provider, { provider, streams: [] });
    }
    map.get(provider)!.streams.push(stream);
  }

  // Sort streams within each group: FHD first, then HD, then SD
  for (const group of map.values()) {
    group.streams.sort((a, b) => resOrder(a.resolution) - resOrder(b.resolution));
  }

  // Sort groups: best resolution first, then alphabetical
  return [...map.values()].sort((a, b) => {
    const rd = resOrder(a.streams[0]?.resolution ?? null) - resOrder(b.streams[0]?.resolution ?? null);
    if (rd !== 0) return rd;
    return a.provider.localeCompare(b.provider);
  });
}

const resolutionColors: Record<string, string> = {
  FHD: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  HD: 'bg-muted text-muted-foreground border-border',
};

function ResolutionBadge({ resolution }: { resolution: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1.5 h-4 font-semibold',
        resolutionColors[resolution],
      )}
    >
      {resolution}
    </Badge>
  );
}

function StreamRow({
  stream,
  index,
  total,
  onSelect,
}: {
  stream: Stream;
  index: number;
  total: number;
  onSelect: (stream: Stream) => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        'cursor-pointer hover:bg-secondary/60 active:bg-secondary/80',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
      onClick={() => onSelect(stream)}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary/80 text-xs font-medium text-muted-foreground">
        {index + 1}
      </div>
      <span className="text-foreground/90">
        {`Option ${index + 1}`}
      </span>
      <ResolutionBadge resolution={stream.resolution} />
      <span
        className={cn(
          'group/id relative ml-auto cursor-pointer font-mono text-[11px] transition-colors',
          copied
            ? 'text-emerald-400'
            : 'text-muted-foreground/50 hover:text-muted-foreground',
        )}
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(stream.id);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {stream.id.slice(0, 6)}
        <span
          className={cn(
            'pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] shadow transition-opacity',
            copied
              ? 'bg-emerald-500/20 text-emerald-400 opacity-100'
              : 'bg-popover text-popover-foreground opacity-0 group-hover/id:opacity-100',
          )}
        >
          {copied ? 'Copied!' : 'Copy\u00a0ID'}
        </span>
      </span>
    </button>
  );
}

function ProviderGroupSection({
  group,
  onSelect,
}: {
  group: ProviderGroup;
  onSelect: (stream: Stream) => void;
}) {
  return (
    <div>
      {/* Provider header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {group.provider}
        </span>
      </div>

      {/* Stream rows */}
      <div className="flex flex-col gap-px">
        {group.streams.map((stream, i) => (
          <StreamRow
            key={stream.id}
            stream={stream}
            index={i}
            total={group.streams.length}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

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
  const { recommended, others } = useMemo(() => {
    if (!channel) return { recommended: [], others: [] };

    const recStreams = channel.streams.filter(s => s.recommended);
    const otherStreams = channel.streams.filter(s => !s.recommended);

    return {
      recommended: groupStreams(recStreams),
      others: groupStreams(otherStreams),
    };
  }, [channel]);

  const hasRecommended = recommended.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[80dvh] flex-col overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-0">
          <DialogTitle>Select a stream</DialogTitle>
          <DialogDescription asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-2.5 py-1 text-xs text-secondary-foreground w-fit">
              {channel && CHANNEL_ICONS[channel.name] ? (
                <img src={CHANNEL_ICONS[channel.name]} alt="" className="size-4 shrink-0" />
              ) : (
                <Tv className="size-3 shrink-0" />
              )}
              <span className="truncate">{channel?.name}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain px-2 pb-2">
          {hasRecommended && (
            <>
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <Star className="size-3.5" />
                <span className="text-sm font-semibold text-foreground">
                  Recommended
                </span>
              </div>
              {recommended.map((group) => (
                <ProviderGroupSection
                  key={`rec-${group.provider}`}
                  group={group}
                  onSelect={onSelect}
                />
              ))}
              {others.length > 0 && (
                <>
                  <div className="mx-3 my-2 border-t border-border" />
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <List className="size-3.5" />
                    <span className="text-sm font-semibold text-foreground">
                      Others
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {others.map((group) => (
            <ProviderGroupSection
              key={group.provider}
              group={group}
              onSelect={onSelect}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
