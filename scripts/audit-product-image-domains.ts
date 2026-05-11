/**
 * Group products by their image-URL host so we can spot stock-photo
 * patterns the user might consider "default".
 *
 * Run from /backend:
 *   npx ts-node -r dotenv/config scripts/audit-product-image-domains.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db';

function host(u: string | null | undefined): string {
  if (!u || !u.trim()) return '(null/empty)';
  try {
    const url = new URL(u);
    return url.hostname;
  } catch {
    return u.startsWith('/') ? '(relative)' : '(invalid)';
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const counts: Record<string, number> = {};
  const samplesByHost: Record<string, { id: string; name: string; imageUrl: string }[]> = {};

  for (const p of products) {
    const h = host(p.imageUrl);
    counts[h] = (counts[h] || 0) + 1;
    if (!samplesByHost[h]) samplesByHost[h] = [];
    if (samplesByHost[h].length < 3) {
      samplesByHost[h].push({ id: p.id, name: p.name, imageUrl: p.imageUrl ?? 'null' });
    }
  }

  console.log('Total products:', products.length);
  console.log('');
  console.log('Products grouped by image-URL host:');
  for (const [h, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${h}`);
    for (const s of samplesByHost[h]) {
      const img = s.imageUrl.length > 80 ? s.imageUrl.slice(0, 77) + '…' : s.imageUrl;
      console.log(`        ${s.name.padEnd(36).slice(0, 36)}  ${img}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
