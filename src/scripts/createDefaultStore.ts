/**
 * Script to create a default store
 * Run: npx ts-node src/scripts/createDefaultStore.ts
 */

import { supabase } from '../lib/supabase';

async function createDefaultStore() {
  try {
    console.log('🏪 Creating default store...');

    // First, check if store S-001 already exists
    const { data: existingStore } = await supabase
      .from('Store')
      .select('id, name')
      .eq('id', 'S-001')
      .single();

    if (existingStore) {
      console.log('✅ Store S-001 already exists:', existingStore.name);
      return;
    }

    // Get the first user to be the owner (or use a specific user ID)
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, email, fullName')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found in database. Please create a user first.');
      return;
    }

    const ownerId = users[0].id;
    console.log(`📦 Using owner: ${users[0].fullName} (${users[0].email})`);

    // Create the store
    const { data: store, error: storeError } = await supabase
      .from('Store')
      .insert({
        id: 'S-001',
        name: 'Rasaswadaya Official Store',
        description: 'Official store for traditional Sri Lankan cultural products and merchandise',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        coverUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        location: 'Colombo, Sri Lanka',
        rating: 0,
        reviewCount: 0,
        ownerId: ownerId,
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
    console.log('\n✨ You can now create products with storeId: S-001');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createDefaultStore();
