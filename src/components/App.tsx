import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';

const ACESTREAM_RE = /^[a-fA-F0-9]{40}$/;
const BASE_URL = 'https://acestream.hermo.dev/ace/manifest.m3u8?id=';

function extractId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('acestream://')
    ? trimmed.slice('acestream://'.length)
    : trimmed;
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

export default function App() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const id = extractId(input);
  const isValid = ACESTREAM_RE.test(id);
  const streamUrl = isValid ? `${BASE_URL}${id}` : '';
  const vlcUrl = isValid ? `vlc://${streamUrl}` : '';

  function handlePlay() {
    if (!input.trim()) {
      setError('Please enter an AceStream ID');
      return;
    }
    if (!isValid) {
      setError('Invalid ID — must be a 40-character hex string');
      return;
    }
    setError('');
    window.location.href = vlcUrl;
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <h1 className="mb-2 flex items-center justify-center gap-2.5 text-3xl font-bold tracking-tight text-gray-900">
          <Radio className="size-7" />
          AceStream Player
        </h1>
        <p className="mb-10 text-center text-sm text-gray-400">
          Paste an ID to open the stream in VLC
        </p>

        <Frame>
          <div className="w-[560px] max-w-[calc(100vw-2rem)] px-6 py-6 sm:px-16 sm:py-10">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
              placeholder="Enter AceStream ID..."
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl bg-white px-4 py-3.5 font-mono text-sm text-gray-900 placeholder-gray-300 outline-none border border-gray-200 shadow-sm transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-error"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {isValid && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 truncate rounded-lg bg-white/60 px-3 py-2 font-mono text-xs text-gray-400 border border-gray-100"
              >
                {vlcUrl}
              </motion.p>
            )}

            <div className="mt-4 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePlay}
                disabled={!input.trim()}
                className="flex-1 rounded-xl bg-gray-900 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Play in VLC
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!streamUrl) return;
                  navigator.clipboard.writeText(streamUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                disabled={!isValid}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </motion.button>
            </div>
          </div>
        </Frame>

        <a
          href="https://ipfs.io/ipns/k2k4r8oqlcjxsritt5mczkcn4mmvcmymbqw7113fz2flkrerfwfps004/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 text-sm text-gray-400 underline underline-offset-2 transition hover:text-gray-600"
        >
          Find AceStream IDs here
        </a>
      </motion.div>

      <p className="absolute bottom-4 text-xs text-gray-900/30">
        &copy; {new Date().getFullYear()} AceStream Player
      </p>
    </div>
  );
}
