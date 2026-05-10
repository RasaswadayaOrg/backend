/**
 * One-off data hygiene pass: walks every Artist + Event row and rewrites
 * `category` to the canonical art-form taxonomy (music | dance | film | drama).
 *
 * Mirrors the `normaliseCategory` helper used by admin.controller.ts so that
 * legacy free-text values land on the same buckets the recommender filters on.
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/normalise-taxonomy.ts          # dry-run, prints the diff
 *   npx tsx scripts/normalise-taxonomy.ts --apply  # actually writes
 */
import { prisma } from '../src/lib/db';

const CANONICAL = new Set(['music', 'dance', 'film', 'drama']);

const ALIAS: Record<string, string> = {
  // music family
  concert: 'music', 'live music': 'music', baila: 'music', classical: 'music',
  carnatic: 'music', orchestra: 'music', choir: 'music', band: 'music', opera: 'music',
  'folk music': 'music', singer: 'music', vocalist: 'music', instrumental: 'music',
  hindustani: 'music', jazz: 'music', rock: 'music', pop: 'music', rap: 'music',
  'hip hop': 'music', 'hip-hop': 'music', dj: 'music', edm: 'music',
  // dance family
  kandyan: 'dance', 'kandyan dance': 'dance', ballet: 'dance',
  'contemporary dance': 'dance', 'folk dance': 'dance', bharatanatyam: 'dance',
  dancing: 'dance', dancer: 'dance', 'low country': 'dance', sabaragamuwa: 'dance',
  // drama family
  theatre: 'drama', theater: 'drama', play: 'drama', nadagam: 'drama', kolam: 'drama',
  nurthi: 'drama', stage: 'drama', teledrama: 'drama', stageplay: 'drama',
  'stage play': 'drama', acting: 'drama',
  // film family
  cinema: 'film', movie: 'film', screening: 'film', documentary: 'film',
  'short film': 'film', 'film festival': 'film', filmmaking: 'film',
  director: 'film', actor: 'film', actress: 'film',
};

function normalise(raw: string | null | undefined, fallback = 'music'): string {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return fallback;
  if (CANONICAL.has(value)) return value;
  if (ALIAS[value]) return ALIAS[value];
  // partial match — handle stuff like "live music concert" or "kandyan drumming"
  for (const [token, canon] of Object.entries(ALIAS)) {
    if (value.includes(token)) return canon;
  }
  for (const canon of CANONICAL) {
    if (value.includes(canon)) return canon;
  }
  return fallback;
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '🚧 APPLY mode — writes will be committed' : '🔍 DRY-RUN — no writes (pass --apply to commit)');
  console.log('');

  // ---- Artists ----
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true, category: true, subCategory: true },
  });
  const artistChanges: Array<{ id: string; name: string; from: string; to: string }> = [];
  for (const a of artists) {
    const next = normalise(a.category, 'music');
    if (next !== a.category) {
      artistChanges.push({ id: a.id, name: a.name, from: a.category || '(empty)', to: next });
    }
  }

  // ---- Events ----
  const events = await prisma.event.findMany({
    select: { id: true, title: true, category: true, subCategory: true },
  });
  const eventChanges: Array<{ id: string; title: string; from: string; to: string }> = [];
  for (const e of events) {
    const next = normalise(e.category, 'music');
    if (next !== e.category) {
      eventChanges.push({ id: e.id, title: e.title, from: e.category || '(empty)', to: next });
    }
  }

  // ---- Distribution summary ----
  const dist = (rows: Array<{ category: string | null }>) => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.category || '(empty)', (m.get(r.category || '(empty)') || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  console.log('── Artist categories (current) ──');
  dist(artists).forEach(([k, v]) => console.log(`  ${k.padEnd(24)} ${v}`));
  console.log('');
  console.log('── Event categories (current) ──');
  dist(events).forEach(([k, v]) => console.log(`  ${k.padEnd(24)} ${v}`));
  console.log('');

  console.log(`── Pending artist rewrites (${artistChanges.length}) ──`);
  artistChanges.slice(0, 50).forEach((c) =>
    console.log(`  [${c.id.slice(0, 8)}] ${c.name.padEnd(28)} ${c.from} → ${c.to}`)
  );
  if (artistChanges.length > 50) console.log(`  …and ${artistChanges.length - 50} more`);
  console.log('');

  console.log(`── Pending event rewrites (${eventChanges.length}) ──`);
  eventChanges.slice(0, 50).forEach((c) =>
    console.log(`  [${c.id.slice(0, 8)}] ${c.title.padEnd(40)} ${c.from} → ${c.to}`)
  );
  if (eventChanges.length > 50) console.log(`  …and ${eventChanges.length - 50} more`);
  console.log('');

  if (!apply) {
    console.log('Done (dry-run). Re-run with --apply to commit.');
    return;
  }

  let updated = 0;
  for (const c of artistChanges) {
    await prisma.artist.update({ where: { id: c.id }, data: { category: c.to } });
    updated++;
  }
  for (const c of eventChanges) {
    await prisma.event.update({ where: { id: c.id }, data: { category: c.to } });
    updated++;
  }
  console.log(`✅ Updated ${updated} rows.`);
  console.log('Now refresh the AI graph: curl -X POST $AI_API_URL/refresh');
}

main()
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
