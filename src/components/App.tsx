import { useState, useEffect, useMemo } from 'react';
import { agendaSchema, type ChannelEntry, type Stream, type Event, type Agenda } from '@/lib/channels';
import { CompetitionSection } from '@/components/CompetitionSection';
import { Header, type Day } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { StreamDialog } from '@/components/StreamDialog';
import { PlayerDialog } from '@/components/PlayerDialog';

const AGENDA_URLS: Record<Day, string> = {
  today: '/data/agenda.json',
  tomorrow: '/data/agenda-tomorrow.json',
};

function getDayFromUrl(): Day {
  const params = new URLSearchParams(window.location.search);
  const d = params.get('day');
  return d === 'tomorrow' ? 'tomorrow' : 'today';
}

function setDayInUrl(day: Day) {
  const url = new URL(window.location.href);
  if (day === 'today') {
    url.searchParams.delete('day');
  } else {
    url.searchParams.set('day', day);
  }
  window.history.replaceState(null, '', url);
}

export default function App() {
  const [day, setDay] = useState<Day>(getDayFromUrl);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // Modal state: channel selection → stream selection → player selection
  const [selectedChannel, setSelectedChannel] = useState<ChannelEntry | null>(null);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  useEffect(() => {
    setDayInUrl(day);
  }, [day]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setAgenda(null);
    fetch(AGENDA_URLS[day])
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load agenda');
        return res.json();
      })
      .then((data: unknown) => {
        setAgenda(agendaSchema.parse(data));
        setLoading(false);
      })
      .catch(() => {
        setError(`Could not load ${day === 'today' ? "today's" : "tomorrow's"} agenda`);
        setLoading(false);
      });
  }, [day]);

  function handleChannelSelect(channel: ChannelEntry) {
    if (channel.streams.length === 1) {
      setSelectedStream(channel.streams[0]);
    } else {
      setSelectedChannel(channel);
    }
  }

  function handleStreamSelect(stream: Stream) {
    setSelectedStream(stream);
  }

  function closeModals() {
    setSelectedChannel(null);
    setSelectedStream(null);
  }

  const groupedEvents = useMemo(() => {
    const all = agenda?.events ?? [];
    const filtered = search.trim()
      ? all.filter((e) => {
          const q = search.toLowerCase();
          return (
            e.homeTeam.name.toLowerCase().includes(q) ||
            e.awayTeam.name.toLowerCase().includes(q)
          );
        })
      : all;

    const groups = new Map<string, Event[]>();
    for (const event of filtered) {
      const key = event.competition || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    return groups;
  }, [agenda, search]);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <Header date={agenda?.date} day={day} onDayChange={setDay} />

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="relative mx-auto flex w-[90%] flex-1 flex-col">
          <div className="absolute w-px top-0 bottom-0 left-0 bg-foreground/7 pointer-events-none overflow-clip line-glow-v" />
          <div className="absolute w-px top-0 bottom-0 right-0 bg-foreground/7 pointer-events-none overflow-clip line-glow-v-delayed" />

        {!loading && !error && (agenda?.events.length ?? 0) > 0 && (
          <SearchBar search={search} onSearchChange={setSearch} />
        )}

        <main>
          {loading && (
            <div className="flex items-center justify-center px-4 py-20">
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            </div>
          )}

          {error && (
            <div className="px-4 py-20 text-center text-sm text-muted-foreground">{error}</div>
          )}

          {!loading && !error && groupedEvents.size === 0 && (
            <div className="px-4 py-20 text-center text-sm text-muted-foreground">
              {search && (agenda?.events.length ?? 0) > 0
                ? `No matches found for "${search}"`
                : `No events scheduled for ${day === 'today' ? 'today' : 'tomorrow'}`}
            </div>
          )}

          {!loading && !error && groupedEvents.size > 0 && (
            <div className="flex flex-col gap-6">
              {[...groupedEvents.entries()].map(([competition, events]) => (
                <CompetitionSection
                  key={competition}
                  name={competition}
                  events={events}
                  onChannelSelect={handleChannelSelect}
                />
              ))}
            </div>
          )}
        </main>

        <p className="mt-auto pt-8 pb-4 text-center text-xs text-muted-foreground/40">
          &copy; {new Date().getFullYear()} AceStream Player
        </p>
        </div>
      </div>

      <StreamDialog
        channel={selectedChannel}
        open={!!selectedChannel && !selectedStream}
        onClose={() => setSelectedChannel(null)}
        onSelect={handleStreamSelect}
      />

      <PlayerDialog
        stream={selectedStream}
        showBack={!!selectedChannel}
        onBack={() => setSelectedStream(null)}
        onClose={closeModals}
      />
    </div>
  );
}
