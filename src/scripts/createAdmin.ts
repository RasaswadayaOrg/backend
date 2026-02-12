import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createId } from '@paralleldrive/cuid2';

// Load environment variables
dotenv.config();

// Create Supabase client with service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAdminUser() {
  try {
    const adminEmail = 'rasaya@123';
    const adminPassword = 'rasaya';
    
    console.log('🔍 Checking if admin user exists...');
    
    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('User')
      .select('id, email, role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingAdmin) {
      console.log('❌ Admin user already exists with email:', adminEmail);
      console.log('Admin user ID:', existingAdmin.id);
      console.log('Current role:', existingAdmin.role);
      return;
    }

    console.log('✨ Creating admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Generate CUID for the user
    const userId = createId();

    // Create admin user
    const { data: admin, error: createError } = await supabaseAdmin
      .from('User')
      .insert({
        id: userId,
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Administrator',
        firstName: 'Admin',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating admin user:', createError);
      return;
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email/Username:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 User ID:', admin.id);
    console.log('👑 Role: ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!');
    console.log('📝 Login URL: http://localhost:3000/admin/login');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
