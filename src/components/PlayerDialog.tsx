import { useState } from 'react';
import { Copy, Check, ArrowLeft, Monitor, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Stream } from '@/lib/channels';
import type { AcestreamStatus } from '@/lib/useLocalAcestream';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const BASE_URL = 'https://acestream.hermo.dev/ace/getstream?id=';

const PLAYERS = [
  { name: 'VLC', icon: '/icons/vlc.svg', scheme: (url: string) => `vlc://${url}` },
  { name: 'mpv', icon: '/icons/mpv.svg', scheme: (url: string) => `mpv://${url}` },
  { name: 'Infuse', icon: '/icons/infuse.png', scheme: (url: string) => `infuse://x-callback-url/play?url=${encodeURIComponent(url)}` },
  { name: 'MX Player', icon: '/icons/mxplayer.svg', scheme: (url: string) => `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;type=video/mp2t;end` },
  { name: 'nPlayer', icon: '/icons/nplayer.png', scheme: (url: string) => `nplayer-${url}` },
] as const;

function PlayerRow({
  icon,
  label,
  sublabel,
  className,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        'cursor-pointer hover:bg-secondary/60 active:bg-secondary/80',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary/80">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-foreground/90">{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </button>
  );
}

export function PlayerDialog({
  stream,
  showBack,
  onBack,
  onClose,
  acestream,
}: {
  stream: Stream | null;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
  acestream: { status: AcestreamStatus; getStreamUrl: (id: string) => string };
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!stream) return;
    const streamUrl = `${BASE_URL}${stream.id}`;

    function onSuccess() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(streamUrl).then(onSuccess, fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const textarea = document.createElement('textarea');
      textarea.value = streamUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onSuccess();
    }
  }

  function openIn(player: (typeof PLAYERS)[number]) {
    if (!stream) return;
    const streamUrl = `${BASE_URL}${stream.id}`;
    window.location.href = player.scheme(streamUrl);
    onClose();
  }

  function handleLocalAcestream() {
    if (!stream || acestream.status !== 'connected') return;
    window.open(acestream.getStreamUrl(stream.id), '_blank');
    onClose();
  }

  const isConnected = acestream.status === 'connected';

  return (
    <Dialog open={!!stream} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[80dvh] flex-col overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                onClick={onBack}
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle>Choose a player</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-2.5 py-1 text-xs text-secondary-foreground w-fit">
              <img src="/icons/acestream.svg" alt="" className="size-4 shrink-0" />
              <span className="truncate">{stream?.name}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain px-2 pb-2">
          {/* Local section */}
          {isConnected && (
            <>
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <Monitor className="size-3.5" />
                <span className="text-sm font-semibold text-foreground">
                  Local
                </span>
              </div>
              <div className="flex flex-col gap-px">
                <PlayerRow
                  icon={<img src="/icons/acestream.svg" alt="" className="size-4" />}
                  label="Acestream Engine"
                  sublabel="Open with local engine"
                  onClick={handleLocalAcestream}
                />
              </div>
              <div className="mx-3 my-2 border-t border-border" />
            </>
          )}

          {/* Remote section */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <Globe className="size-3.5" />
            <span className="text-sm font-semibold text-foreground">
              Remote
            </span>
            <button
              onClick={handleCopy}
              className={cn(
                'group/copy relative ml-auto flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors',
                copied
                  ? 'text-green-500'
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <div className="flex flex-col gap-px">
            {PLAYERS.map((player) => (
              <PlayerRow
                key={player.name}
                icon={<img src={player.icon} alt="" className="size-4" />}
                label={player.name}
                onClick={() => openIn(player)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
