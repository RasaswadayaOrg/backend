import { prisma } from '../lib/db';

async function grantAdmin() {
  try {
    const email = '2022cs223@stu.ucsc.cmb.ac.lk';
    
    console.log('🔍 Looking for user:', email);
    
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Current Role:', user.role);
    console.log('  Full Name:', user.fullName);

    if (user.role === 'ADMIN') {
      console.log('✅ User already has ADMIN role!');
      return;
    }

    console.log('\n🔄 Updating role to ADMIN...');
    
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });

    console.log('\n✅ Successfully granted ADMIN role!');
    console.log('  Updated Role:', updated.role);
    console.log('\n👑 User is now an administrator!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantAdmin();
