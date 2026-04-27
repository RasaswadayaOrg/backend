const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArtists() {
  try {
    console.log('🔍 Checking all artists in database...\n');
    
    const { data: artists, error } = await supabase
      .from('Artist')
      .select('id, name, userId, profession, genre, createdAt')
      .order('createdAt', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!artists || artists.length === 0) {
      console.log('📝 No artists found in database');
      return;
    }

    console.log(`✅ Found ${artists.length} artists:\n`);
    artists.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   ID: ${artist.id}`);
      console.log(`   User ID: ${artist.userId || 'None'}`);
      console.log(`   Profession: ${artist.profession}`);
      console.log(`   Genre: ${artist.genre}`);
      console.log(`   Created: ${new Date(artist.createdAt).toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkArtists();
