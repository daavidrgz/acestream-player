# CLAUDE.md

## Project overview

Acestream Player is an Astro + React web app that aggregates live sports broadcast schedules from three sources (futbolenlatv.es, wheresthematch.com, ESPN Scoreboard API) and pairs them with acestream links.

## Key commands

```bash
pnpm install          # Install dependencies
pnpm run scrape       # Scrape acestream channels from IPFS
pnpm run agenda       # Generate agenda.json from broadcast sources
pnpm run scrape-all   # Run scrape + agenda sequentially
pnpm run dev          # Start Astro dev server
pnpm run build        # Production build
```

## Proxy setup (Claude Code web)

**Only needed when `HTTP_PROXY` / `HTTPS_PROXY` env vars are already set** (e.g. inside Claude Code web). Node.js `fetch` ignores these variables by default, so you must opt in explicitly:

```bash
# First check if a proxy is configured:
echo $HTTP_PROXY

# If it prints a URL, prefix commands with NODE_OPTIONS:
NODE_OPTIONS="--use-env-proxy" pnpm run agenda
NODE_OPTIONS="--use-env-proxy" pnpm run scrape
NODE_OPTIONS="--use-env-proxy" pnpm run scrape-all

# If HTTP_PROXY is empty, run commands normally without NODE_OPTIONS.
```

The `--use-env-proxy` flag (Node 22+) tells the built-in `fetch` to route requests through the proxy. **Do not set this flag if no proxy env vars exist** — it is unnecessary and may cause connection issues.

## Project structure

- `scripts/generate-agenda/` — Broadcast data pipeline (see `ARCHITECTURE.md` inside)
- `scripts/scrape-channels/` — Acestream channel scraper
- `src/lib/channels.ts` — Channel, Competition, Sport enums + Zod schemas
- `data/` — Generated JSON output (agenda, acestream channels)
- `public/icons/` — Channel and competition SVG logos
