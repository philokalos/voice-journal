#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import ProgressBar from 'progress';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  },
  migration: {
    dryRun: process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run'),
    batchSize: parseInt(process.env.BATCH_SIZE) || 100,
    logLevel: process.env.MIGRATION_LOG_LEVEL || 'info',
    usersOnly: process.argv.includes('--users-only'),
    entriesOnly: process.argv.includes('--entries-only'),
    audioOnly: process.argv.includes('--audio-only')
  }
};

// Migration state and reporting
const migrationReport = {
  startTime: new Date(),
  users: { total: 0, migrated: 0, errors: 0 },
  entries: { total: 0, migrated: 0, errors: 0 },
  audioFiles: { total: 0, migrated: 0, errors: 0, skipped: 0 },
  errors: []
};

// Initialize clients
let supabase;
let firebaseDb;
let firebaseAuth;
let firebaseStorage;

/**
 * Initialize Supabase and Firebase clients
 */
async function initializeClients() {
  console.log('🔌 Initializing clients...');
  
  // Validate configuration
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error('Supabase configuration missing. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
    throw new Error('Firebase configuration missing. Please check FIREBASE_* environment variables');
  }

  // Initialize Supabase client
  supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail
      }),
      projectId: config.firebase.projectId,
      storageBucket: `${config.firebase.projectId}.appspot.com`
    });
  }

  firebaseDb = admin.firestore();
  firebaseAuth = admin.auth();
  firebaseStorage = admin.storage().bucket();

  console.log('✅ Clients initialized successfully');
}

/**
 * Log function with different levels
 */
function log(level, message, data = null) {
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  const configLevel = levels[config.migration.logLevel] || 2;
  
  if (levels[level] <= configLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    console.log(prefix, message);
    if (data && config.migration.logLevel === 'debug') {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Add error to migration report
 */
function addError(type, message, details = null) {
  const error = {
    type,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  migrationReport.errors.push(error);
  log('error', `${type}: ${message}`, details);
}

/**
 * Get all users from Supabase auth
 */
async function getSupabaseUsers() {
  log('info', '👥 Fetching users from Supabase...');
  
  try {
    // Get users from Supabase auth.users table via RPC or admin API
    // Note: We'll need to use the Supabase management API or create an RPC function
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust based on your user count
    });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    migrationReport.users.total = data.users.length;
    log('info', `📊 Found ${data.users.length} users to migrate`);
    return data.users;
  } catch (error) {
    addError('USER_FETCH', 'Failed to fetch users from Supabase', error);
    throw error;
  }
}

/**
 * Migrate a single user to Firebase Auth
 */
async function migrateUser(supabaseUser) {
  try {
    const userData = {
      uid: supabaseUser.id,
      email: supabaseUser.email,
      emailVerified: supabaseUser.email_confirmed_at !== null,
      displayName: supabaseUser.user_metadata?.full_name || null,
      photoURL: supabaseUser.user_metadata?.avatar_url || null,
      disabled: false,
      metadata: {
        creationTime: supabaseUser.created_at,
        lastSignInTime: supabaseUser.last_sign_in_at
      }
    };

    if (config.migration.dryRun) {
      log('debug', `[DRY RUN] Would migrate user: ${userData.email}`, userData);
      return true;
    }

    // Try to get existing user first
    try {
      await firebaseAuth.getUser(userData.uid);
      log('info', `User ${userData.email} already exists in Firebase, skipping`);
      return true;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    await firebaseAuth.createUser(userData);
    log('info', `✅ Migrated user: ${userData.email}`);
    migrationReport.users.migrated++;
    return true;
  } catch (error) {
    addError('USER_MIGRATION', `Failed to migrate user ${supabaseUser.email}`, error);
    migrationReport.users.errors++;
    return false;
  }
}

/**
 * Get all entries from Supabase
 */
async function getSupabaseEntries() {
  log('info', '📝 Fetching entries from Supabase...');
  
  try {
    let allEntries = [];
    let from = 0;
    const limit = config.migration.batchSize;
    
    while (true) {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .range(from, from + limit - 1)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch entries: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allEntries = allEntries.concat(data);
      from += limit;
      
      log('debug', `Fetched ${data.length} entries (total: ${allEntries.length})`);
    }

    migrationReport.entries.total = allEntries.length;
    log('info', `📊 Found ${allEntries.length} entries to migrate`);
    return allEntries;
  } catch (error) {
    addError('ENTRY_FETCH', 'Failed to fetch entries from Supabase', error);
    throw error;
  }
}

/**
 * Migrate a single entry to Firestore
 */
async function migrateEntry(supabaseEntry) {
  try {
    // Transform Supabase entry to Firebase format
    const entryData = {
      user_id: supabaseEntry.user_id,
      date: supabaseEntry.date,
      transcript: supabaseEntry.transcript,
      wins: supabaseEntry.wins || [],
      regrets: supabaseEntry.regrets || [],
      tasks: supabaseEntry.tasks || [],
      keywords: supabaseEntry.keywords || [],
      sentiment_score: supabaseEntry.sentiment_score || 0,
      audio_file_path: supabaseEntry.audio_file_path || null,
      created_at: supabaseEntry.created_at,
      updated_at: supabaseEntry.updated_at
    };

    if (config.migration.dryRun) {
      log('debug', `[DRY RUN] Would migrate entry: ${supabaseEntry.id}`, entryData);
      return true;
    }

    // Check if entry already exists
    const existingEntry = await firebaseDb.collection('entries').doc(supabaseEntry.id).get();
    if (existingEntry.exists) {
      log('info', `Entry ${supabaseEntry.id} already exists in Firestore, skipping`);
      return true;
    }

    // Create entry in Firestore with the same ID
    await firebaseDb.collection('entries').doc(supabaseEntry.id).set(entryData);
    
    log('info', `✅ Migrated entry: ${supabaseEntry.id}`);
    migrationReport.entries.migrated++;
    return true;
  } catch (error) {
    addError('ENTRY_MIGRATION', `Failed to migrate entry ${supabaseEntry.id}`, error);
    migrationReport.entries.errors++;
    return false;
  }
}

/**
 * Migrate audio file from Supabase Storage to Firebase Storage
 */
async function migrateAudioFile(audioFilePath, userId) {
  try {
    if (!audioFilePath) {
      migrationReport.audioFiles.skipped++;
      return true;
    }

    // Extract filename from path
    const fileName = audioFilePath.split('/').pop();
    const firebasePath = `voices/${userId}/${fileName}`;

    if (config.migration.dryRun) {
      log('debug', `[DRY RUN] Would migrate audio file: ${audioFilePath} -> ${firebasePath}`);
      return true;
    }

    // Check if file already exists in Firebase Storage
    try {
      const [exists] = await firebaseStorage.file(firebasePath).exists();
      if (exists) {
        log('info', `Audio file ${firebasePath} already exists in Firebase Storage, skipping`);
        return true;
      }
    } catch (error) {
      // File doesn't exist, continue with migration
    }

    // Download file from Supabase Storage
    const { data: supabaseFile, error } = await supabase.storage
      .from('audio-recordings')
      .download(audioFilePath);

    if (error) {
      throw new Error(`Failed to download from Supabase: ${error.message}`);
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await supabaseFile.arrayBuffer());

    // Upload to Firebase Storage
    const firebaseFile = firebaseStorage.file(firebasePath);
    await firebaseFile.save(buffer, {
      metadata: {
        contentType: supabaseFile.type || 'audio/webm',
        cacheControl: 'public, max-age=31536000',
      },
    });

    log('info', `✅ Migrated audio file: ${audioFilePath} -> ${firebasePath}`);
    migrationReport.audioFiles.migrated++;
    return true;
  } catch (error) {
    addError('AUDIO_MIGRATION', `Failed to migrate audio file ${audioFilePath}`, error);
    migrationReport.audioFiles.errors++;
    return false;
  }
}

/**
 * Generate and save migration report
 */
async function generateReport() {
  migrationReport.endTime = new Date();
  migrationReport.duration = migrationReport.endTime - migrationReport.startTime;
  
  const reportPath = `./migration-report-${Date.now()}.json`;
  await fs.writeJSON(reportPath, migrationReport, { spaces: 2 });
  
  console.log('\n📊 Migration Report:');
  console.log('==================');
  console.log(`Duration: ${Math.round(migrationReport.duration / 1000)}s`);
  console.log(`Users: ${migrationReport.users.migrated}/${migrationReport.users.total} (${migrationReport.users.errors} errors)`);
  console.log(`Entries: ${migrationReport.entries.migrated}/${migrationReport.entries.total} (${migrationReport.entries.errors} errors)`);
  console.log(`Audio Files: ${migrationReport.audioFiles.migrated}/${migrationReport.audioFiles.total} (${migrationReport.audioFiles.errors} errors, ${migrationReport.audioFiles.skipped} skipped)`);
  console.log(`Total Errors: ${migrationReport.errors.length}`);
  console.log(`Report saved to: ${reportPath}`);
  
  if (migrationReport.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    migrationReport.errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.message}`);
    });
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Supabase to Firebase migration...');
    console.log(`Mode: ${config.migration.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    
    await initializeClients();

    // Migrate users (unless entries-only or audio-only)
    if (!config.migration.entriesOnly && !config.migration.audioOnly) {
      const users = await getSupabaseUsers();
      
      if (users.length > 0) {
        const userProgressBar = new ProgressBar('Migrating users [:bar] :current/:total (:percent) :etas', {
          complete: '█',
          incomplete: '░',
          width: 40,
          total: users.length
        });

        for (const user of users) {
          await migrateUser(user);
          userProgressBar.tick();
        }
      }
    }

    // Migrate entries (unless users-only or audio-only)
    if (!config.migration.usersOnly && !config.migration.audioOnly) {
      const entries = await getSupabaseEntries();
      
      if (entries.length > 0) {
        const entryProgressBar = new ProgressBar('Migrating entries [:bar] :current/:total (:percent) :etas', {
          complete: '█',
          incomplete: '░',
          width: 40,
          total: entries.length
        });

        // Count audio files for progress tracking
        const audioFiles = entries.filter(entry => entry.audio_file_path);
        migrationReport.audioFiles.total = audioFiles.length;

        for (const entry of entries) {
          await migrateEntry(entry);
          
          // Migrate associated audio file if exists
          if (!config.migration.usersOnly && entry.audio_file_path) {
            await migrateAudioFile(entry.audio_file_path, entry.user_id);
          }
          
          entryProgressBar.tick();
        }
      }
    }

    // Migrate audio files only (if audio-only mode)
    if (config.migration.audioOnly) {
      const entries = await getSupabaseEntries();
      const audioFiles = entries.filter(entry => entry.audio_file_path);
      migrationReport.audioFiles.total = audioFiles.length;

      if (audioFiles.length > 0) {
        const audioProgressBar = new ProgressBar('Migrating audio files [:bar] :current/:total (:percent) :etas', {
          complete: '█',
          incomplete: '░',
          width: 40,
          total: audioFiles.length
        });

        for (const entry of audioFiles) {
          await migrateAudioFile(entry.audio_file_path, entry.user_id);
          audioProgressBar.tick();
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    addError('MIGRATION', 'Migration failed', error);
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await generateReport();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted by user');
  await generateReport();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await generateReport();
  process.exit(1);
});

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;