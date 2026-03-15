import { useState, useEffect, useCallback } from 'react';

const LOCAL_ACESTREAM_PORT = 6878;
const CHECK_URL = `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/webui/api/service?method=get_version`;
const POLL_INTERVAL = 30_000; // re-check every 30s

export type AcestreamStatus = 'checking' | 'connected' | 'disconnected';

export function useLocalAcestream() {
  const [status, setStatus] = useState<AcestreamStatus>('checking');

  const check = useCallback(() => {
    fetch(CHECK_URL, { signal: AbortSignal.timeout(3000) })
      .then((res) => setStatus(res.ok ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  const getStreamUrl = useCallback(
    (streamId: string) =>
      `http://127.0.0.1:${LOCAL_ACESTREAM_PORT}/ace/getstream?id=${streamId}`,
    [],
  );

  return { status, check, getStreamUrl };
}
