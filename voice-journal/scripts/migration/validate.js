#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config();

// Initialize clients
let supabase;
let firebaseDb;
let firebaseAuth;
let firebaseStorage;

/**
 * Initialize clients
 */
async function initializeClients() {
  console.log('🔌 Initializing clients for validation...');
  
  // Initialize Supabase client
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    });
  }

  firebaseDb = admin.firestore();
  firebaseAuth = admin.auth();
  firebaseStorage = admin.storage().bucket();
}

/**
 * Validate user migration
 */
async function validateUsers() {
  console.log('\n👥 Validating user migration...');
  
  try {
    // Get user counts from both systems
    const { data: supabaseUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    const firebaseUsersList = await firebaseAuth.listUsers(1000);
    
    console.log(`📊 Supabase users: ${supabaseUsers.users.length}`);
    console.log(`📊 Firebase users: ${firebaseUsersList.users.length}`);
    
    if (supabaseUsers.users.length !== firebaseUsersList.users.length) {
      console.log('⚠️  User count mismatch detected');
    } else {
      console.log('✅ User counts match');
    }
    
    // Sample validation of random users
    const sampleSize = Math.min(5, supabaseUsers.users.length);
    const sampleUsers = supabaseUsers.users.slice(0, sampleSize);
    
    console.log(`\n🔍 Validating ${sampleSize} sample users...`);
    
    for (const supabaseUser of sampleUsers) {
      try {
        const firebaseUser = await firebaseAuth.getUser(supabaseUser.id);
        
        if (firebaseUser.email === supabaseUser.email) {
          console.log(`✅ User ${supabaseUser.email}: Email matches`);
        } else {
          console.log(`❌ User ${supabaseUser.email}: Email mismatch`);
        }
      } catch (error) {
        console.log(`❌ User ${supabaseUser.email}: Not found in Firebase`);
      }
    }
    
  } catch (error) {
    console.error('❌ User validation failed:', error.message);
  }
}

/**
 * Validate entries migration
 */
async function validateEntries() {
  console.log('\n📝 Validating entries migration...');
  
  try {
    // Get entry counts
    const { count: supabaseCount } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true });
    
    const firebaseSnapshot = await firebaseDb.collection('entries').get();
    const firebaseCount = firebaseSnapshot.size;
    
    console.log(`📊 Supabase entries: ${supabaseCount}`);
    console.log(`📊 Firebase entries: ${firebaseCount}`);
    
    if (supabaseCount !== firebaseCount) {
      console.log('⚠️  Entry count mismatch detected');
    } else {
      console.log('✅ Entry counts match');
    }
    
    // Sample validation of random entries
    const { data: sampleEntries } = await supabase
      .from('entries')
      .select('*')
      .limit(5);
    
    console.log(`\n🔍 Validating ${sampleEntries.length} sample entries...`);
    
    for (const supabaseEntry of sampleEntries) {
      try {
        const firebaseDoc = await firebaseDb
          .collection('entries')
          .doc(supabaseEntry.id)
          .get();
        
        if (firebaseDoc.exists) {
          const firebaseData = firebaseDoc.data();
          
          // Check key fields
          const checks = {
            'User ID': firebaseData.user_id === supabaseEntry.user_id,
            'Transcript': firebaseData.transcript === supabaseEntry.transcript,
            'Date': firebaseData.date === supabaseEntry.date,
            'Sentiment Score': Math.abs(firebaseData.sentiment_score - supabaseEntry.sentiment_score) < 0.01
          };
          
          let allMatch = true;
          for (const [field, matches] of Object.entries(checks)) {
            if (matches) {
              console.log(`  ✅ ${field} matches`);
            } else {
              console.log(`  ❌ ${field} mismatch`);
              allMatch = false;
            }
          }
          
          if (allMatch) {
            console.log(`✅ Entry ${supabaseEntry.id}: All fields match`);
          }
        } else {
          console.log(`❌ Entry ${supabaseEntry.id}: Not found in Firebase`);
        }
      } catch (error) {
        console.log(`❌ Entry ${supabaseEntry.id}: Validation error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Entry validation failed:', error.message);
  }
}

/**
 * Validate audio files migration
 */
async function validateAudioFiles() {
  console.log('\n🎵 Validating audio files migration...');
  
  try {
    // Get entries with audio files
    const { data: entriesWithAudio } = await supabase
      .from('entries')
      .select('audio_file_path, user_id')
      .not('audio_file_path', 'is', null);
    
    console.log(`📊 Entries with audio files: ${entriesWithAudio.length}`);
    
    if (entriesWithAudio.length === 0) {
      console.log('ℹ️  No audio files to validate');
      return;
    }
    
    let validatedCount = 0;
    let errorCount = 0;
    
    // Sample validation of audio files
    const sampleSize = Math.min(5, entriesWithAudio.length);
    const sampleEntries = entriesWithAudio.slice(0, sampleSize);
    
    console.log(`🔍 Validating ${sampleSize} sample audio files...`);
    
    for (const entry of sampleEntries) {
      try {
        const fileName = entry.audio_file_path.split('/').pop();
        const firebasePath = `voices/${entry.user_id}/${fileName}`;
        
        const [exists] = await firebaseStorage.file(firebasePath).exists();
        
        if (exists) {
          console.log(`✅ Audio file exists: ${firebasePath}`);
          validatedCount++;
        } else {
          console.log(`❌ Audio file missing: ${firebasePath}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`❌ Audio validation error for ${entry.audio_file_path}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`📊 Audio validation: ${validatedCount} verified, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Audio file validation failed:', error.message);
  }
}

/**
 * Generate validation summary
 */
function generateSummary() {
  console.log('\n📋 Validation Summary:');
  console.log('=====================');
  console.log('✅ User migration validation completed');
  console.log('✅ Entry migration validation completed');
  console.log('✅ Audio file migration validation completed');
  console.log('\nReview the output above for any mismatches or errors.');
  console.log('If you see persistent issues, consider re-running the migration for affected data.');
}

/**
 * Main validation function
 */
async function runValidation() {
  try {
    console.log('🔍 Starting migration validation...\n');
    
    await initializeClients();
    await validateUsers();
    await validateEntries();
    await validateAudioFiles();
    
    generateSummary();
    
    console.log('\n🎉 Validation completed!');
    
  } catch (error) {
    console.error('\n💥 Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
runValidation();