import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import type { ScrapedChannel } from './types';

const OUT_PATH = resolve(import.meta.dirname!, '../../data/acestream-channels.json');

const PAGE_URL = 'https://ipfs.io/ipns/k2k4r8oqlcjxsritt5mczkcn4mmvcmymbqw7113fz2flkrerfwfps004/?tab=canales';

// Acestream IDs personally verified to be reliable.
const RECOMMENDED_STREAMS = new Set<string>([
  '3ace1463a7cad979c3a4002b245487e9982e9f1a',
  '0febfb5cac3384f487d55c559bbfc877db2d0357',
  '4636ed75106cb00e9c70cc2029edf0a4df7ad73f',
]);

// Override resolution for specific streams.
const RESOLUTION_OVERRIDES: Record<string, 'HD' | 'FHD'> = {
  '0febfb5cac3384f487d55c559bbfc877db2d0357': 'FHD',
  '4636ed75106cb00e9c70cc2029edf0a4df7ad73f': 'FHD',
};

async function main() {
  console.log('Fetching page...');
  const res = await fetch(PAGE_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();

  const channels: ScrapedChannel[] = [];

  const groupSplit = html.split(/<div class="channel-group"/);

  for (const section of groupSplit.slice(1)) {
    const groupMatch = section.match(/data-group="([^"]+)"/);
    const category = groupMatch ? groupMatch[1] : 'UNKNOWN';

    const cardPattern = /<h4 class="channel-name">([\s\S]*?)<\/h4>[\s\S]*?<div class="url-container">\s*([a-f0-9]{40})\s*<\/div>/g;
    let match;
    while ((match = cardPattern.exec(section)) !== null) {
      const name = match[1].trim();
      const id = match[2].trim();
      const resolution = RESOLUTION_OVERRIDES[id] ?? (/\bFHD\b/i.test(name) ? 'FHD' as const : 'HD' as const);
      channels.push({
        category,
        name,
        id,
        resolution,
        ...(RECOMMENDED_STREAMS.has(id) ? { recommended: true } : {}),
      });
    }
  }

  console.log(`Scraped ${channels.length} channels`);

  const byCat: Record<string, number> = {};
  for (const ch of channels) {
    byCat[ch.category] = (byCat[ch.category] || 0) + 1;
  }
  console.log('Categories:', Object.entries(byCat).map(([k, v]) => `${k} (${v})`).join(', '));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(channels, null, 2));
  console.log(`Written to ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
