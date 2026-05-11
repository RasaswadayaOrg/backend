/**
 * Delete products whose imageUrl is null or points to images.unsplash.com.
 *
 * Two-phase tool:
 *   Dry-run (default):  npx ts-node -r dotenv/config scripts/delete-default-products.ts
 *   Execute:            npx ts-node -r dotenv/config scripts/delete-default-products.ts --execute
 *
 * Because CartItem.productId and OrderItem.productId have NO cascade in the
 * schema, this script also removes those referencing rows in the same
 * transaction (user explicitly asked for "let cascade handle related rows").
 */
import 'dotenv/config';
import { prisma } from '../src/lib/db';

const EXECUTE = process.argv.includes('--execute');

function isDefaultImage(u: string | null): boolean {
  if (!u || u.trim() === '') return true;
  if (u.includes('images.unsplash.com')) return true;
  return false;
}

async function main() {
  const all = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true, storeId: true },
  });

  const doomed = all.filter((p) => isDefaultImage(p.imageUrl));
  const doomedIds = doomed.map((p) => p.id);

  console.log(`Total products: ${all.length}`);
  console.log(`Products to delete (default image): ${doomed.length}`);
  console.log('');

  if (doomedIds.length === 0) {
    console.log('Nothing to delete. Exiting.');
    return;
  }

  // Count referencing rows so we know how much collateral cleanup is needed.
  const [cartRefs, orderRefs] = await Promise.all([
    prisma.cartItem.count({ where: { productId: { in: doomedIds } } }),
    prisma.orderItem.count({ where: { productId: { in: doomedIds } } }),
  ]);

  console.log(`CartItems referencing these products:  ${cartRefs}`);
  console.log(`OrderItems referencing these products: ${orderRefs}`);
  console.log('');

  if (!EXECUTE) {
    console.log('Sample (first 15 doomed):');
    for (const p of doomed.slice(0, 15)) {
      const img = (p.imageUrl ?? 'null').slice(0, 50);
      console.log(`  ${p.id}  ${p.name.padEnd(38).slice(0, 38)}  ${img}`);
    }
    if (doomed.length > 15) console.log(`  … and ${doomed.length - 15} more`);
    console.log('');
    console.log('DRY-RUN — no rows were deleted.');
    console.log('Re-run with --execute to actually delete.');
    return;
  }

  // ── Execute ──
  console.log('Deleting in a single transaction…');
  const result = await prisma.$transaction(async (tx) => {
    const ci = await tx.cartItem.deleteMany({ where: { productId: { in: doomedIds } } });
    const oi = await tx.orderItem.deleteMany({ where: { productId: { in: doomedIds } } });
    const pr = await tx.product.deleteMany({ where: { id: { in: doomedIds } } });
    return { cartItems: ci.count, orderItems: oi.count, products: pr.count };
  });
  console.log('Done:');
  console.log(`  CartItems  deleted: ${result.cartItems}`);
  console.log(`  OrderItems deleted: ${result.orderItems}`);
  console.log(`  Products   deleted: ${result.products}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
