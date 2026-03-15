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

function SectionHeader({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

function PlayerRow({
  icon,
  label,
  sublabel,
  isLast,
  className,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  isLast: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary/50',
        !isLast && 'border-b border-border/50',
        isLast && 'rounded-b-xl',
        className,
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex flex-col">
        <span>{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
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
      <DialogContent className="p-0">
        <DialogHeader className="px-4 pt-4">
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
          <DialogDescription>{stream?.name}</DialogDescription>
        </DialogHeader>

        <div>
          {/* Local section */}
          {isConnected && (
            <>
              <SectionHeader
                icon={<Monitor className="size-3.5 text-muted-foreground" />}
                label="Local"
              />
              <PlayerRow
                icon={<img src="/icons/acestream.svg" alt="" className="size-5" />}
                label="Local Acestream"
                sublabel="Open with local engine"
                isLast={false}
                className="text-green-500"
                onClick={handleLocalAcestream}
              />
            </>
          )}

          {/* Remote section */}
          <SectionHeader
            icon={<Globe className="size-3.5 text-muted-foreground" />}
            label="Remote"
            trailing={
              <button
                onClick={handleCopy}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-colors',
                  copied
                    ? 'text-green-500'
                    : 'text-muted-foreground/60 hover:bg-secondary/60 hover:text-muted-foreground',
                )}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            }
          />
          {PLAYERS.map((player, i) => (
            <PlayerRow
              key={player.name}
              icon={<img src={player.icon} alt="" className="size-5" />}
              label={player.name}
              isLast={i === PLAYERS.length - 1}
              onClick={() => openIn(player)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
