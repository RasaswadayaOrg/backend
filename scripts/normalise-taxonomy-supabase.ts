/**
 * Data hygiene pass via the Supabase REST API (works even when the Postgres
 * pooler isn't reachable from this machine). Rewrites Artist + Event
 * `category` fields to the canonical art-form taxonomy.
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/normalise-taxonomy-supabase.ts          # dry-run
 *   npx tsx scripts/normalise-taxonomy-supabase.ts --apply  # commit
 */
import { supabase } from '../src/lib/supabase';

const CANONICAL = new Set(['music', 'dance', 'film', 'drama']);

const ALIAS: Record<string, string> = {
  concert: 'music', 'live music': 'music', baila: 'music', classical: 'music',
  carnatic: 'music', orchestra: 'music', choir: 'music', band: 'music', opera: 'music',
  'folk music': 'music', singer: 'music', vocalist: 'music', instrumental: 'music',
  hindustani: 'music', jazz: 'music', rock: 'music', pop: 'music', rap: 'music',
  'hip hop': 'music', 'hip-hop': 'music', dj: 'music', edm: 'music',
  kandyan: 'dance', 'kandyan dance': 'dance', ballet: 'dance',
  'contemporary dance': 'dance', 'folk dance': 'dance', bharatanatyam: 'dance',
  dancing: 'dance', dancer: 'dance', 'low country': 'dance', sabaragamuwa: 'dance',
  theatre: 'drama', theater: 'drama', play: 'drama', nadagam: 'drama', kolam: 'drama',
  nurthi: 'drama', stage: 'drama', teledrama: 'drama', stageplay: 'drama',
  'stage play': 'drama', acting: 'drama',
  cinema: 'film', movie: 'film', screening: 'film', documentary: 'film',
  'short film': 'film', 'film festival': 'film', filmmaking: 'film',
  director: 'film', actor: 'film', actress: 'film',
};

function normalise(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return null;
  if (CANONICAL.has(value)) return value;
  if (ALIAS[value]) return ALIAS[value];
  for (const [token, canon] of Object.entries(ALIAS)) {
    if (value.includes(token)) return canon;
  }
  for (const canon of CANONICAL) {
    if (value.includes(canon)) return canon;
  }
  return null; // ambiguous — leave it alone, recommender will skip it
}

const dist = (rows: Array<{ category: string | null }>) => {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.category || '(empty)', (m.get(r.category || '(empty)') || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '🚧 APPLY mode — writes will be committed' : '🔍 DRY-RUN — no writes (pass --apply to commit)');
  console.log('');

  const { data: artists, error: aErr } = await supabase
    .from('Artist')
    .select('id, name, category, subCategory');
  if (aErr) throw aErr;

  const { data: events, error: eErr } = await supabase
    .from('Event')
    .select('id, title, category, subCategory');
  if (eErr) throw eErr;

  console.log(`── Artist categories (current, ${artists?.length ?? 0} rows) ──`);
  dist(artists ?? []).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${v}`));
  console.log('');
  console.log(`── Event categories (current, ${events?.length ?? 0} rows) ──`);
  dist(events ?? []).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${v}`));
  console.log('');

  const artistChanges: Array<{ id: string; name: string; from: string; to: string }> = [];
  const artistSkips: Array<{ id: string; name: string; from: string }> = [];
  for (const a of artists ?? []) {
    const next = normalise(a.category);
    if (next === null) {
      if (a.category && !CANONICAL.has(a.category)) {
        artistSkips.push({ id: a.id, name: a.name, from: a.category });
      }
    } else if (next !== a.category) {
      artistChanges.push({ id: a.id, name: a.name, from: a.category || '(empty)', to: next });
    }
  }
  const eventChanges: Array<{ id: string; title: string; from: string; to: string }> = [];
  const eventSkips: Array<{ id: string; title: string; from: string }> = [];
  for (const e of events ?? []) {
    const next = normalise(e.category);
    if (next === null) {
      if (e.category && !CANONICAL.has(e.category)) {
        eventSkips.push({ id: e.id, title: e.title, from: e.category });
      }
    } else if (next !== e.category) {
      eventChanges.push({ id: e.id, title: e.title, from: e.category || '(empty)', to: next });
    }
  }

  console.log(`── Pending artist rewrites (${artistChanges.length}) ──`);
  artistChanges.slice(0, 80).forEach((c) =>
    console.log(`  [${String(c.id).slice(0, 8)}] ${c.name.padEnd(30)} ${c.from.padEnd(20)} → ${c.to}`)
  );
  if (artistChanges.length > 80) console.log(`  …and ${artistChanges.length - 80} more`);
  console.log('');

  console.log(`── Pending event rewrites (${eventChanges.length}) ──`);
  eventChanges.slice(0, 80).forEach((c) =>
    console.log(`  [${String(c.id).slice(0, 8)}] ${c.title.padEnd(40)} ${c.from.padEnd(20)} → ${c.to}`)
  );
  if (eventChanges.length > 80) console.log(`  …and ${eventChanges.length - 80} more`);
  console.log('');

  if (artistSkips.length || eventSkips.length) {
    console.log(`── Skipped (ambiguous, manual review needed) ──`);
    artistSkips.forEach((s) => console.log(`  artist [${String(s.id).slice(0, 8)}] ${s.name.padEnd(30)} category='${s.from}'`));
    eventSkips.forEach((s) => console.log(`  event  [${String(s.id).slice(0, 8)}] ${s.title.padEnd(40)} category='${s.from}'`));
    console.log('');
  }

  if (!apply) {
    console.log('Done (dry-run). Re-run with --apply to commit.');
    return;
  }

  let updated = 0;
  for (const c of artistChanges) {
    const { error } = await supabase.from('Artist').update({ category: c.to }).eq('id', c.id);
    if (error) {
      console.error(`  ✖ artist ${c.id}: ${error.message}`);
    } else {
      updated++;
    }
  }
  for (const c of eventChanges) {
    const { error } = await supabase.from('Event').update({ category: c.to }).eq('id', c.id);
    if (error) {
      console.error(`  ✖ event ${c.id}: ${error.message}`);
    } else {
      updated++;
    }
  }
  console.log(`✅ Updated ${updated} rows.`);
  console.log('Now refresh the AI graph: curl -X POST $AI_API_URL/refresh');
}

main()
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
