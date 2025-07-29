#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test configuration and connectivity
 */
async function testConfiguration() {
  console.log('🧪 Testing Migration Configuration...\n');

  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];

  console.log('📋 Environment Variables:');
  let missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: Missing`);
    } else {
      // Mask sensitive values
      const displayValue = varName.includes('KEY') || varName.includes('PRIVATE') 
        ? `${value.substring(0, 20)}...` 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please configure these in your .env file');
    process.exit(1);
  }

  // Test Supabase connection
  console.log('\n🔌 Testing Supabase Connection...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test connection by checking if entries table exists
    const { data, error } = await supabase
      .from('entries')
      .select('count(*)', { count: 'exact', head: true });

    if (error && !error.message.includes('relation "entries" does not exist')) {
      throw error;
    }

    const count = data ? 'accessible' : 'no entries table found';
    console.log(`✅ Supabase connection successful (entries table: ${count})`);
    
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    process.exit(1);
  }

  // Test Firebase connection
  console.log('\n🔥 Testing Firebase Connection...');
  try {
    const admin = await import('firebase-admin');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
    }

    // Test Firestore connection
    const db = admin.default.firestore();
    await db.collection('_test').limit(1).get();
    console.log('✅ Firebase Firestore connection successful');

    // Test Storage connection
    const storage = admin.default.storage().bucket();
    await storage.getMetadata();
    console.log('✅ Firebase Storage connection successful');

    // Test Auth connection
    const auth = admin.default.auth();
    // Just verify we can access the auth service
    try {
      await auth.listUsers(1);
    } catch (error) {
      if (!error.message.includes('Insufficient permission')) {
        throw error;
      }
    }
    console.log('✅ Firebase Auth connection successful');
    
  } catch (error) {
    console.log(`❌ Firebase connection failed: ${error.message}`);
    process.exit(1);
  }

  // Configuration summary
  console.log('\n📊 Migration Configuration Summary:');
  console.log(`Batch Size: ${process.env.BATCH_SIZE || 100}`);
  console.log(`Log Level: ${process.env.MIGRATION_LOG_LEVEL || 'info'}`);
  console.log(`Dry Run: ${process.env.DRY_RUN === 'true' ? 'Enabled' : 'Disabled'}`);

  console.log('\n🎉 Configuration test completed successfully!');
  console.log('You can now run the migration with: npm run migrate');
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Configuration test failed:', reason);
  process.exit(1);
});

// Run test
testConfiguration();