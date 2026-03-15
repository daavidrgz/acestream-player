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
  '51b363b1c4d42724e05240ad068ad219df8042ec',
  'dddff67edfa7061f643ec5ae0be110169850363d',
  'eb4975702ceadca7ed74f8707e17a9f55569dbb9',
  'a5b9d834ad92bfb80fe01bf89cc20bd68be199fb',
  'ed74406ccdb3c21941b919db6bffca7f1de015bb',
  '866a8af8faacf8fc9eb997ab5a68b4dfee4edc77',
  'bfa01c11c5c6b7a616a516de4f2c769a89d26b25',
  '3774d8feab016ca766b35ea8488e7514ca30e0ee',
]);

// Override resolution for specific streams.
const RESOLUTION_OVERRIDES: Record<string, 'HD' | 'FHD'> = {
  '0febfb5cac3384f487d55c559bbfc877db2d0357': 'FHD',
  '4636ed75106cb00e9c70cc2029edf0a4df7ad73f': 'FHD',
  '51b363b1c4d42724e05240ad068ad219df8042ec': 'FHD',
  '476b6f6583517bd75c15c4663bf45fab7c8da9cf': 'FHD',
  'bfa01c11c5c6b7a616a516de4f2c769a89d26b25': 'FHD',
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
