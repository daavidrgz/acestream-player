import { useState, useEffect, useCallback } from 'react';

const LOCAL_ACESTREAM_PORT = 6878;
const CHECK_URL = `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/webui/api/service?method=get_version`;
const POLL_INTERVAL = 30_000; // re-check every 30s

export type AcestreamStatus = 'checking' | 'connected' | 'disconnected';

export interface LocalPlayer {
  id: string;
  name: string;
}

export function useLocalAcestream() {
  const [status, setStatus] = useState<AcestreamStatus>('checking');
  const [players, setPlayers] = useState<LocalPlayer[]>([]);

  const fetchPlayers = useCallback(async () => {
    try {
      const url = `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/server/api?api_version=3&method=get_available_players&content_id=test`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (!data.error && data.result?.players) {
        setPlayers(data.result.players);
      } else {
        setPlayers([]);
      }
    } catch {
      setPlayers([]);
    }
  }, []);

  const check = useCallback(() => {
    fetch(CHECK_URL, { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        const connected = res.ok;
        setStatus(connected ? 'connected' : 'disconnected');
        if (connected) fetchPlayers();
        else setPlayers([]);
      })
      .catch(() => {
        setStatus('disconnected');
        setPlayers([]);
      });
  }, [fetchPlayers]);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  const getAcestreamUrl = useCallback(
    (streamId: string) => `acestream://${streamId}`,
    [],
  );

  const getHlsUrl = useCallback(
    (streamId: string) =>
      `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/ace/manifest.m3u8?id=${streamId}`,
    [],
  );

  const openInPlayer = useCallback(
    async (playerId: string, streamId: string) => {
      const url = `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/server/api?method=open_in_player&player_id=${encodeURIComponent(playerId)}&content_id=${streamId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    },
    [],
  );

  return { status, players, check, getAcestreamUrl, getHlsUrl, openInPlayer };
}
