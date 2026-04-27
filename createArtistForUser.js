const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createArtistProfile() {
  try {
    const userId = 'cmli55cm2000088ba9jp79btg';
    
    console.log('🎨 Creating artist profile for approved ARTIST role user...\n');
    
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.fullName);
    console.log('   Role:', user.role);
    
    if (user.role !== 'ARTIST') {
      console.log('⚠️ User is not an ARTIST');
      return;
    }

    // Check if artist profile already exists
    const { data: existingArtist } = await supabase
      .from('Artist')
      .select('id')
      .eq('userId', userId)
      .single();

    if (existingArtist) {
      console.log('ℹ️ Artist profile already exists!');
      return;
    }

    // Create artist profile
    const artistData = {
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: userId,
      name: user.fullName || 'Artist',
      profession: 'Artist',
      genre: 'General',
      bio: 'Professional Artist',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('\n📝 Creating artist profile...');
    
    const { data: newArtist, error: createError } = await supabase
      .from('Artist')
      .insert(artistData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create artist profile:', createError.message);
      return;
    }

    console.log('\n✅ Artist profile created successfully!');
    console.log('   Artist ID:', newArtist.id);
    console.log('   Name:', newArtist.name);
    console.log('   Profession:', newArtist.profession);
    console.log('\n🎉 User will now appear in the artists page!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createArtistProfile();
