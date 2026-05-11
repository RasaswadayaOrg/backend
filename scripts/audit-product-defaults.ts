/**
 * Dry-run: lists products with image URLs that look like defaults so we can
 * decide what to delete.
 *
 * Run from /backend:
 *   npx ts-node -r dotenv/config scripts/audit-product-defaults.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db';

// Patterns we treat as "default / placeholder" imagery.
const DEFAULT_PATTERNS = [
  { label: 'null / empty',     test: (u: string | null) => !u || u.trim() === '' },
  { label: '/logo.svg',        test: (u: string | null) => !!u && u.includes('/logo.svg') },
  { label: '/logo.png',        test: (u: string | null) => !!u && u.includes('/logo.png') },
  { label: 'placehold.co',     test: (u: string | null) => !!u && u.includes('placehold.co') },
  { label: 'placeholder.com',  test: (u: string | null) => !!u && u.includes('placeholder.com') },
  { label: 'photo-1524117074681 (marketplace fallback)', test: (u: string | null) => !!u && u.includes('photo-1524117074681') },
  { label: 'photo-1606760227091 (homepage fallback)',    test: (u: string | null) => !!u && u.includes('photo-1606760227091') },
];

function classify(u: string | null): string | null {
  for (const p of DEFAULT_PATTERNS) {
    if (p.test(u)) return p.label;
  }
  return null;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true, storeId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const totals: Record<string, number> = {};
  const matched: { bucket: string; id: string; name: string; imageUrl: string | null; storeId: string | null }[] = [];

  for (const p of products) {
    const bucket = classify(p.imageUrl);
    if (bucket) {
      totals[bucket] = (totals[bucket] || 0) + 1;
      matched.push({
        bucket,
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        storeId: p.storeId ?? null,
      });
    }
  }

  console.log('Total products:', products.length);
  console.log('Products with default-looking imageUrl:', matched.length);
  console.log('');
  console.log('By bucket:');
  for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }
  console.log('');
  console.log('Sample (first 20 matched rows):');
  for (const row of matched.slice(0, 20)) {
    const img = (row.imageUrl ?? 'null').slice(0, 60);
    console.log(`  [${row.bucket}]  ${row.id}  ${row.name}  ${img}`);
  }
  if (matched.length > 20) {
    console.log(`  … and ${matched.length - 20} more`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
