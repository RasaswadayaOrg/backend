/**
 * Re-classify Artist.category using the artist's `profession` + `genre`
 * fields, which carry richer signal than the broad `category` column.
 *
 * Mapping rules (in priority order — first match wins):
 *   profession contains 'singer','composer','musician','vocalist','instrumentalist','playback'  -> music
 *   profession contains 'theatre','playwright','stage'                                            -> drama
 *   profession contains 'dancer','choreographer'                                                  -> dance
 *   profession contains 'film director','filmmaker','cinematographer'                             -> film
 *   profession contains 'actor','actress' AND genre mentions 'theatre' or 'stage'                 -> drama
 *   profession contains 'actor','actress'                                                         -> film
 *   profession contains 'director' AND genre mentions 'film' or 'cinema'                          -> film
 *   profession contains 'director' AND genre mentions 'theatre' or 'drama'                        -> drama
 *   fallback: keep current category
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/reclassify-artists.ts          # dry-run
 *   npx tsx scripts/reclassify-artists.ts --apply  # commit
 */
import { supabase } from '../src/lib/supabase';

type Form = 'music' | 'dance' | 'film' | 'drama' | null;

function classify(profession: string, genre: string): Form {
  const p = (profession || '').toLowerCase();
  const g = (genre || '').toLowerCase();

  // 1. Music professions are unambiguous
  if (/\b(singer|composer|musician|vocalist|instrumentalist|playback|drummer|guitarist|pianist|violinist|flautist|sitar|tabla|dj)\b/.test(p)) {
    return 'music';
  }
  // 2. Music director — a film music composer is still a musician
  if (/music director/.test(p)) return 'music';

  // 3. Theatre / stage professions
  if (/\b(theatre|theater|playwright|stage)\b/.test(p)) return 'drama';

  // 4. Dance professions
  if (/\b(dancer|choreographer)\b/.test(p)) return 'dance';

  // 5. Film-making professions
  if (/\b(film director|filmmaker|cinematographer)\b/.test(p) || /^director$/.test(p)) {
    // disambiguate plain "director" via genre
    if (/\b(theatre|theater|stage|drama)\b/.test(g) && !/\b(film|cinema)\b/.test(g)) return 'drama';
    return 'film';
  }

  // 6. Actor/Actress — theatre artists go to drama, screen actors to film
  if (/\b(actor|actress)\b/.test(p)) {
    if (/theatre artist|theater artist|stage actor/.test(p)) return 'drama';
    if (/\b(theatre|theater|stage|modern_stage_drama|nadagam|kolam|nurthi)\b/.test(g)) {
      // If primary genre token is theatre, it's drama
      const firstGenre = g.split(/[,;]/)[0]?.trim() || '';
      if (/\b(theatre|theater|stage|drama)\b/.test(firstGenre)) return 'drama';
    }
    return 'film';
  }

  // 7. Generic 'director' falls back via genre
  if (/director/.test(p)) {
    if (/\b(theatre|theater|stage|drama)\b/.test(g)) return 'drama';
    if (/\b(film|cinema)\b/.test(g)) return 'film';
  }

  return null; // can't decide — leave category alone
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '🚧 APPLY mode' : '🔍 DRY-RUN (pass --apply to commit)');
  console.log('');

  const { data: artists, error } = await supabase
    .from('Artist')
    .select('id, name, category, profession, genre');
  if (error) throw error;

  const changes: Array<{ id: string; name: string; from: string; to: Form; profession: string }> = [];
  for (const a of artists ?? []) {
    const next = classify(a.profession ?? '', a.genre ?? '');
    if (next && next !== a.category) {
      changes.push({ id: a.id, name: a.name, from: a.category, to: next, profession: a.profession ?? '' });
    }
  }

  // Group by transition for easy review
  const byTransition = new Map<string, typeof changes>();
  for (const c of changes) {
    const key = `${c.from} → ${c.to}`;
    if (!byTransition.has(key)) byTransition.set(key, []);
    byTransition.get(key)!.push(c);
  }

  console.log(`Re-classifying ${changes.length} of ${artists?.length ?? 0} artists\n`);
  for (const [transition, list] of [...byTransition.entries()].sort()) {
    console.log(`── ${transition} (${list.length}) ──`);
    list.forEach((c) => console.log(`  ${c.name.padEnd(30)} prof=${c.profession}`));
    console.log('');
  }

  if (!apply) {
    console.log('Done (dry-run). Re-run with --apply to commit.');
    return;
  }

  let updated = 0;
  for (const c of changes) {
    const { error: uErr } = await supabase.from('Artist').update({ category: c.to }).eq('id', c.id);
    if (uErr) console.error(`  ✖ ${c.name}: ${uErr.message}`);
    else updated++;
  }
  console.log(`✅ Updated ${updated} artists.`);
  console.log('Now refresh AI: curl -X POST http://127.0.0.1:8000/refresh');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
