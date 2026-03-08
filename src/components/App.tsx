import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import type { Mesh } from 'three';

const ACESTREAM_RE = /^[a-fA-F0-9]{40}$/;
const BASE_URL = 'https://acestream.hermo.dev/play/';

function SoccerBall() {
  const ref = useRef<Mesh>(null!);
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.15;
    ref.current.rotation.x += delta * 0.08;
  });
  return (
    <mesh ref={ref} scale={2.8}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#4ade80"
        wireframe
        transparent
        opacity={0.12}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <Canvas
      className="!fixed inset-0 -z-10"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: false }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <SoccerBall />
    </Canvas>
  );
}

function extractId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('acestream://')
    ? trimmed.slice('acestream://'.length)
    : trimmed;
}

export default function App() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const id = extractId(input);
  const isValid = ACESTREAM_RE.test(id);
  const vlcUrl = isValid ? `vlc://${BASE_URL}${id}` : '';

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
    <>
      <Scene />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl bg-surface/80 p-6 backdrop-blur-xl border border-white/5 shadow-2xl"
        >
          <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-white">
            AceStream Player
          </h1>
          <p className="mb-6 text-center text-sm text-white/40">
            Paste an ID to open the stream in VLC
          </p>

          <motion.input
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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
            className="w-full rounded-xl bg-surface-light/80 px-4 py-3.5 font-mono text-sm text-white placeholder-white/25 outline-none ring-1 ring-white/10 transition focus:ring-accent/60"
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
              className="mt-3 truncate rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-white/30"
            >
              {vlcUrl}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePlay}
            disabled={!input.trim()}
            className="mt-4 w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-30"
          >
            Play in VLC
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}
