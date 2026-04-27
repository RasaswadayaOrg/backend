const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificUser() {
  try {
    const userId = 'cmli55cm2000088ba9jp79btg'; // User who made the request
    
    console.log('🔍 Checking user and artist profile...\n');
    
    // Check user role
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, email, fullName, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Check if artist profile exists
    const { data: artist, error: artistError } = await supabase
      .from('Artist')
      .select('*')
      .eq('userId', userId)
      .single();

    if (artistError || !artist) {
      console.log('❌ NO Artist profile found for this user!');
      console.log('   This is why they don\'t appear in artists list.');
      return;
    }

    console.log('✅ Artist Profile EXISTS:');
    console.log(`   Artist ID: ${artist.id}`);
    console.log(`   Name: ${artist.name}`);
    console.log(`   Profession: ${artist.profession}`);
    console.log(`   Genre: ${artist.genre}`);
    console.log(`   Bio: ${artist.bio || 'None'}`);
    console.log(`   Created: ${new Date(artist.createdAt).toLocaleString()}`);
    console.log('');
    console.log('✅ This artist SHOULD appear in the artists page!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSpecificUser();
