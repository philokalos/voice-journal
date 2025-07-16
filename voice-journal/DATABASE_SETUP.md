# Database Setup Guide

This guide will help you set up the Supabase database for the Voice Journal application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Database Migration

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of `infra/supabase/migrations/20250716_create_entries_table.sql`
5. Click **Run** to execute the migration

### Method 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
supabase db push
```

## Environment Variables

After setting up the database, you need to configure your environment variables:

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project dashboard under **Settings > API**.

## Verification

To verify that everything is set up correctly:

1. Start the development server: `npm run dev`
2. Sign up for a new account or sign in
3. Try creating a test entry using the database test interface
4. Check that the entry appears in your Supabase dashboard under **Table Editor > entries**

## Database Schema

The migration creates the following:

### Tables

- **entries**: Stores journal entries with transcript, analysis results, and metadata
  - Row Level Security (RLS) enabled
  - Users can only access their own entries

### Storage

- **audio-recordings**: Private bucket for storing audio files
  - 10MB file size limit
  - Supports common audio formats (wav, mp3, mp4, webm, ogg)
  - User-specific folder structure

### Policies

- Users can only read, write, update, and delete their own entries
- Users can only access their own audio files in storage

## Troubleshooting

### Common Issues

1. **"relation does not exist" error**
   - Make sure you've run the database migration successfully
   - Check that your Supabase project URL is correct

2. **"RLS policy violation" error**
   - Ensure you're signed in to the application
   - Check that RLS policies are properly configured

3. **Storage upload errors**
   - Verify that the audio-recordings bucket exists
   - Check that storage policies are configured correctly

### Getting Help

If you encounter issues:

1. Check the browser console for detailed error messages
2. Review the Supabase dashboard logs
3. Ensure all environment variables are correctly set
4. Verify that your Supabase project is active and not paused