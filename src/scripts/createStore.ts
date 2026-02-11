/**
 * Script to create a store with custom ID
 * Run: npx ts-node src/scripts/createStore.ts <storeId> <storeName> <ownerId>
 */

import { supabase } from '../lib/supabase';

async function createStore() {
  try {
    const storeId = process.argv[2] || 'S-002';
    const storeName = process.argv[3] || 'Cultural Products Store';
    const ownerId = process.argv[4];

    console.log(`🏪 Creating store: ${storeId}...`);

    // First, check if store already exists
    const { data: existingStore } = await supabase
      .from('Store')
      .select('id, name')
      .eq('id', storeId)
      .single();

    if (existingStore) {
      console.log(`✅ Store ${storeId} already exists: ${existingStore.name}`);
      return;
    }

    // Get owner
    let owner = null;
    if (ownerId) {
      const { data: userData } = await supabase
        .from('User')
        .select('id, email, fullName')
        .eq('id', ownerId)
        .single();
      
      if (!userData) {
        console.error(`❌ User with ID ${ownerId} not found`);
        return;
      }
      owner = userData;
    } else {
      // Get the first user
      const { data: users } = await supabase
        .from('User')
        .select('id, email, fullName')
        .limit(1);

      if (!users || users.length === 0) {
        console.error('❌ No users found in database. Please create a user first.');
        return;
      }
      owner = users[0];
    }

    console.log(`📦 Owner: ${owner.fullName} (${owner.email})`);

    // Create the store
    const { data: store, error: storeError } = await supabase
      .from('Store')
      .insert({
        id: storeId,
        name: storeName,
        description: `${storeName} - Premium Sri Lankan cultural products`,
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        coverUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        location: 'Colombo, Sri Lanka',
        rating: 0,
        reviewCount: 0,
        ownerId: owner.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (storeError) {
      console.error('❌ Error creating store:', storeError);
      return;
    }

    console.log('✅ Store created successfully!');
    console.log('📋 Store Details:');
    console.log(`   ID: ${store.id}`);
    console.log(`   Name: ${store.name}`);
    console.log(`   Location: ${store.location}`);
    console.log(`   Owner ID: ${store.ownerId}`);
    console.log(`\n✨ You can now create products with storeId: ${storeId}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createStore();
