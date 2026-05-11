/**
 * One-off audit: artists with no photoUrl, events with no imageUrl.
 * Run from /backend with:
 *   npx ts-node -r dotenv/config scripts/find-missing-images.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db';

const TRIM_THRESHOLD = 300; // print up to N rows per category, then summarise

async function main() {
  // ── Artists ──
  const artists = await prisma.artist.findMany({
    where: {
      OR: [
        { photoUrl: null },
        { photoUrl: '' },
      ],
    },
    select: { id: true, name: true, category: true, profession: true, photoUrl: true },
    orderBy: { name: 'asc' },
  });

  // ── Events ──
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: '' },
      ],
    },
    select: { id: true, title: true, category: true, eventDate: true, imageUrl: true },
    orderBy: { eventDate: 'desc' },
  });

  const out: any = {
    artistsWithoutPhoto: {
      count: artists.length,
      items: artists.slice(0, TRIM_THRESHOLD),
      truncated: artists.length > TRIM_THRESHOLD,
    },
    eventsWithoutImage: {
      count: events.length,
      items: events.slice(0, TRIM_THRESHOLD),
      truncated: events.length > TRIM_THRESHOLD,
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
