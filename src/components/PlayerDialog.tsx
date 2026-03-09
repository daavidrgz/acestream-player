import { useState } from 'react';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Stream } from '@/lib/channels';
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

export function PlayerDialog({
  stream,
  showBack,
  onBack,
  onClose,
}: {
  stream: Stream | null;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
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

  const items = [
    { key: 'copy', label: copied ? 'Copied!' : 'Copy Link', icon: copied ? <Check className="size-5 text-green-500" /> : <Copy className="size-5" />, onClick: handleCopy },
    ...PLAYERS.map((p) => ({ key: p.name, label: p.name, icon: <img src={p.icon} alt="" className="size-5" />, onClick: () => openIn(p) })),
  ];

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
          {items.map((item, i) => (
            <div
              key={item.key}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-secondary/50',
                i === items.length - 1 ? 'rounded-b-xl' : 'border-b border-border/50',
              )}
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
