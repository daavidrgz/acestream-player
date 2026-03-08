import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Tv, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const BASE_URL = 'https://acestream.hermo.dev/ace/getstream?id=';

const PLAYERS = [
  { name: 'VLC', icon: '/icons/vlc.svg', scheme: (url: string) => `vlc://${url}` },
  { name: 'mpv', icon: '/icons/mpv.svg', scheme: (url: string) => `mpv://${url}` },
  { name: 'Infuse', icon: '/icons/infuse.png', scheme: (url: string) => `infuse://x-callback-url/play?url=${encodeURIComponent(url)}` },
  { name: 'MX Player', icon: '/icons/mxplayer.svg', scheme: (url: string) => `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;type=video/mp2t;end` },
  { name: 'nPlayer', icon: '/icons/nplayer.png', scheme: (url: string) => `nplayer-${url}` },
] as const;

interface Stream {
  name: string;
  id: string;
  availability: number | null;
}

interface Channel {
  name: string;
  streams: Stream[];
}

interface Team {
  name: string;
  badge: string;
}

interface Event {
  time: string;
  competition: string;
  homeTeam: Team;
  awayTeam: Team;
  channels: Channel[];
}

interface Agenda {
  generatedAt: string;
  date: string;
  events: Event[];
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="frame">
      <div className="frame-line frame-line--top" />
      <div className="frame-line frame-line--bottom" />
      <div className="frame-line frame-line--left" />
      <div className="frame-line frame-line--right" />
      <span className="frame-corner frame-corner--tl" />
      <span className="frame-corner frame-corner--tr" />
      <span className="frame-corner frame-corner--bl" />
      <span className="frame-corner frame-corner--br" />
      {children}
    </div>
  );
}

function TeamBadge({ team, reverse }: { team: Team; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      {team.badge ? (
        <img
          src={team.badge}
          alt={team.name}
          className="size-7 shrink-0 object-contain"
          loading="lazy"
        />
      ) : (
        <div className="size-7 shrink-0 rounded-full bg-gray-200" />
      )}
      <span className="truncate text-sm font-medium text-gray-800">{team.name}</span>
    </div>
  );
}

function StreamPicker({ streams, onSelect }: { streams: Stream[]; onSelect: (stream: Stream) => void }) {
  const [open, setOpen] = useState(false);

  if (streams.length === 1) {
    return (
      <button
        onClick={() => onSelect(streams[0])}
        className="text-xs text-accent hover:text-accent-hover underline underline-offset-2 transition"
      >
        Play
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 text-xs text-accent hover:text-accent-hover underline underline-offset-2 transition"
      >
        {streams.length} streams
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-6 z-30 min-w-56 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
          >
            {streams.map((s) => (
              <button
                key={s.id}
                onClick={() => { onSelect(s); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="truncate flex-1">{s.name}</span>
                {s.availability != null && (
                  <span className={`shrink-0 text-[10px] font-medium ${s.availability >= 0.8 ? 'text-green-600' : s.availability >= 0.4 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {Math.round(s.availability * 100)}%
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChannelPill({ channel, onPlay }: { channel: Channel; onPlay: (stream: Stream) => void }) {
  const hasStreams = channel.streams.length > 0;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
      hasStreams
        ? 'border-accent/20 bg-accent/5 text-gray-700'
        : 'border-gray-200 bg-gray-50 text-gray-400'
    }`}>
      <Tv className="size-3 shrink-0" />
      <span className="truncate">{channel.name}</span>
      {hasStreams && <StreamPicker streams={channel.streams} onSelect={onPlay} />}
    </div>
  );
}

function EventCard({ event, onPlay }: { event: Event; onPlay: (stream: Stream) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
        <Clock className="size-3" />
        <span className="font-medium">{event.time}</span>
        <span className="mx-1">·</span>
        <span className="truncate">{event.competition}</span>
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBadge team={event.homeTeam} reverse />
        <span className="text-xs font-bold text-gray-300">VS</span>
        <TeamBadge team={event.awayTeam} />
      </div>

      {event.channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.channels.map((ch) => (
            <ChannelPill key={ch.name} channel={ch} onPlay={onPlay} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function App() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  useEffect(() => {
    fetch('/data/agenda.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load agenda');
        return res.json();
      })
      .then((data: Agenda) => {
        setAgenda(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load today\'s agenda');
        setLoading(false);
      });
  }, []);

  function openIn(player: (typeof PLAYERS)[number]) {
    if (!selectedStream) return;
    const streamUrl = `${BASE_URL}${selectedStream.id}`;
    window.location.href = player.scheme(streamUrl);
    setSelectedStream(null);
  }

  // Group events by time
  const grouped = agenda?.events.reduce<Record<string, Event[]>>((acc, ev) => {
    (acc[ev.time] ??= []).push(ev);
    return acc;
  }, {}) ?? {};

  const timeSlots = Object.keys(grouped).sort();

  return (
    <div className="min-h-dvh pb-12">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-40 border-b border-gray-200 bg-[#f8f8f8]/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
            <Radio className="size-5" />
            AceStream Player
          </h1>
          {agenda && (
            <span className="text-xs text-gray-400">
              {new Date(agenda.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          )}
        </div>
      </motion.header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-accent" />
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-sm text-gray-400">{error}</div>
        )}

        {!loading && !error && agenda && agenda.events.length === 0 && (
          <div className="py-20 text-center text-sm text-gray-400">
            No events scheduled for today
          </div>
        )}

        {!loading && !error && timeSlots.length > 0 && (
          <Frame>
            <div className="px-2 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                {timeSlots.map((time) => (
                  <div key={time}>
                    {grouped[time].map((event, i) => (
                      <div key={`${event.homeTeam.name}-${event.awayTeam.name}-${i}`} className="mb-3">
                        <EventCard event={event} onPlay={setSelectedStream} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Frame>
        )}
      </main>

      <p className="mt-8 text-center text-xs text-gray-900/30">
        &copy; {new Date().getFullYear()} AceStream Player
      </p>

      {/* Player selection modal */}
      <AnimatePresence>
        {selectedStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedStream(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-80 rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
            >
              <button
                onClick={() => setSelectedStream(null)}
                className="absolute right-4 top-4 text-gray-300 transition hover:text-gray-500"
              >
                <X className="size-5" />
              </button>

              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Choose a player
              </h2>
              <p className="mb-1 text-sm text-gray-400">
                Select an app to open the stream
              </p>
              <p className="mb-5 truncate text-xs text-gray-300 font-mono">
                {selectedStream.name}
              </p>

              <div className="flex flex-col gap-2">
                {PLAYERS.map((player) => (
                  <motion.button
                    key={player.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openIn(player)}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <img src={player.icon} alt="" className="size-5 shrink-0" />
                    {player.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
