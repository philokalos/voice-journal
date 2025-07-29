# Supabase to Firebase Migration Script

This script migrates all user data, journal entries, and audio files from Supabase to Firebase.

## Prerequisites

1. **Node.js 18+** installed
2. **Supabase Service Role Key** with admin privileges
3. **Firebase Service Account Key** with admin privileges
4. Access to both Supabase and Firebase projects

## Setup

1. Navigate to the migration directory:
   ```bash
   cd scripts/migration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Supabase Dashboard > Settings > API
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `FIREBASE_PRIVATE_KEY`: Private key from Firebase service account JSON (escape newlines as \\n)
   - `FIREBASE_CLIENT_EMAIL`: Client email from Firebase service account JSON

## Usage

### Dry Run (Safe Testing)
```bash
npm run migrate:dry-run
```
This simulates the migration without making any changes.

### Full Migration
```bash
npm run migrate
```
Migrates all users, entries, and audio files.

### Partial Migrations
```bash
# Migrate only users
npm run migrate:users-only

# Migrate only entries (requires users to exist)
npm run migrate:entries-only

# Migrate only audio files
npm run migrate:audio-only
```

## Migration Process

The script performs the following steps:

### 1. User Migration
- Fetches all users from Supabase Auth
- Creates corresponding users in Firebase Auth
- Preserves user metadata (email, display name, verification status)
- Maps Supabase UUID to Firebase UID

### 2. Entry Migration
- Fetches all journal entries from Supabase `entries` table
- Transforms data to match Firestore schema
- Creates documents in Firestore `entries` collection
- Preserves all entry data (transcript, wins, regrets, tasks, keywords, sentiment)

### 3. Audio File Migration
- Downloads audio files from Supabase Storage
- Uploads files to Firebase Storage
- Maintains user-specific folder structure (`voices/{userId}/`)
- Preserves file metadata and permissions

## Data Schema Mapping

### Users
```
Supabase Auth → Firebase Auth
- id → uid
- email → email
- email_confirmed_at → emailVerified
- user_metadata.full_name → displayName
- user_metadata.avatar_url → photoURL
```

### Entries
```
Supabase entries table → Firestore entries collection
- id → document ID (preserved)
- user_id → user_id
- date → date
- transcript → transcript
- wins[] → wins[]
- regrets[] → regrets[]
- tasks[] → tasks[]
- keywords[] → keywords[]
- sentiment_score → sentiment_score
- audio_file_path → audio_file_path
- created_at → created_at
- updated_at → updated_at
```

### Audio Files
```
Supabase Storage → Firebase Storage
- audio-recordings/{user_id}/{file} → voices/{user_id}/{file}
```

## Error Handling

The script includes comprehensive error handling:

- **Individual Failures**: If one record fails, others continue processing
- **Duplicate Detection**: Skips existing records to allow re-running
- **Progress Tracking**: Shows progress bars for large migrations
- **Detailed Logging**: Configurable log levels (error, warn, info, debug)
- **Migration Report**: Generates detailed JSON report with statistics

## Configuration Options

Environment variables:
- `DRY_RUN=true`: Run simulation without changes
- `BATCH_SIZE=100`: Number of records to fetch per batch
- `MIGRATION_LOG_LEVEL=info`: Logging level (error|warn|info|debug)

## Monitoring

The script provides:
- Real-time progress bars
- Detailed console logging
- Migration report saved as JSON file
- Error tracking and reporting

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify service account keys are correct
   - Ensure Firebase service account has admin privileges
   - Check Supabase service role key has full access

2. **Missing Data**
   - Verify source Supabase project is correct
   - Check Row Level Security policies allow service role access
   - Ensure all required tables and buckets exist

3. **Permission Errors**
   - Verify Firebase project permissions
   - Check Firestore security rules allow admin access
   - Ensure Storage bucket exists and allows admin access

4. **Network Issues**
   - Run migration from stable network connection
   - Consider running in smaller batches for large datasets
   - Monitor rate limits on both platforms

### Recovery

If migration fails:
1. Check the generated migration report for specific errors
2. Fix underlying issues
3. Re-run migration (script skips existing records)
4. Use partial migration commands to focus on failed areas

## Post-Migration Verification

After migration:
1. Compare record counts between Supabase and Firebase
2. Spot-check random entries for data integrity
3. Verify audio file accessibility
4. Test application functionality with migrated data
5. Run application tests to ensure compatibility

## Security Notes

- Keep service account keys secure and never commit to version control
- Use environment files that are .gitignored
- Consider rotating keys after migration
- Review and update security rules after migration
- Monitor for any unusual activity during migration

## Support

For issues with this migration script:
1. Check the troubleshooting section above
2. Review the generated migration report
3. Check both Supabase and Firebase console logs
4. Verify all prerequisites and configuration