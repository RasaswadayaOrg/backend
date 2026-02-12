import { supabase } from '../lib/supabase';

async function grantAdmin() {
  try {
    const email = '2022cs223@stu.ucsc.cmb.ac.lk';
    
    console.log('🔍 Looking for user:', email);
    
    // Find user
    const { data: user, error: findError } = await supabase
      .from('User')
      .select('id, email, fullName, role')
      .eq('email', email)
      .single();

    if (findError || !user) {
      console.log('❌ User not found:', findError?.message);
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
    
    // Update to ADMIN
    const { data: updated, error: updateError } = await supabase
      .from('User')
      .update({ 
        role: 'ADMIN',
        updatedAt: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }

    console.log('\n✅ Successfully granted ADMIN role!');
    console.log('  Updated Role:', updated.role);
    console.log('\n👑 User is now an administrator!');
    console.log('\n📝 Please logout and login again to apply changes.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

grantAdmin();
