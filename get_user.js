const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    where: { recommendations: { some: {} } },
    take: 3
  });
  console.table(users);
}
main().finally(() => prisma.$disconnect());
