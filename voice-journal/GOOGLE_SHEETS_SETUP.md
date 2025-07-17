# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for Voice Journal.

## Prerequisites

1. A Google Cloud Platform account
2. Access to Google Cloud Console
3. Your Supabase project set up and running

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to **APIs & Services > Library**
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

## Step 2: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Configure consent screen first if prompted:
   - Choose "External" for user type
   - Fill in required app information
   - Add your domain to authorized domains
4. Create OAuth2 credentials:
   - Application type: **Web application**
   - Name: `Voice Journal Google Sheets`
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://your-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/google-sheets/callback` (for development)
     - `https://your-domain.com/auth/google-sheets/callback` (for production)

## Step 3: Configure Environment Variables

Add these environment variables to your Supabase Edge Functions:

### Using Supabase CLI:
```bash
# Set Google OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
supabase secrets set GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google-sheets/callback

# Set OAuth state secret (use a random string)
supabase secrets set OAUTH_STATE_SECRET=your_random_secret_string
```

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Settings > Edge Functions**
3. Add the following environment variables:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth2 client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth2 client secret
   - `GOOGLE_REDIRECT_URI`: Your OAuth2 redirect URI
   - `OAUTH_STATE_SECRET`: A random secret string for state verification

## Step 4: Deploy Edge Functions

Deploy the Google Sheets integration functions:

```bash
# Deploy OAuth function
supabase functions deploy sheets-oauth

# Deploy sync function
supabase functions deploy sheets-sync
```

## Step 5: Update Frontend Configuration

Make sure your `.env` file includes:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 6: Run Database Migrations

Apply the integration database schema:

```bash
supabase migration up
```

## Step 7: Test the Integration

1. Start your development server: `npm run dev`
2. Sign in to your Voice Journal account
3. Go to Settings page
4. Click "Connect Google Sheets"
5. Complete the OAuth flow
6. Create a new journal entry
7. Check that it appears in your Google Sheets

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Make sure the redirect URI in Google Cloud Console matches exactly
   - Check both development and production URLs

2. **"insufficient_scope" error**
   - Ensure Google Sheets API is enabled
   - Check that the scope includes `https://www.googleapis.com/auth/spreadsheets`

3. **Token refresh failures**
   - Verify `GOOGLE_CLIENT_SECRET` is set correctly
   - Check that the refresh token is stored properly

4. **Sync failures**
   - Check Edge Function logs: `supabase functions logs sheets-sync`
   - Verify the user has an active Google Sheets integration

### Testing OAuth Flow:

You can test the OAuth flow manually:

1. Get authorization URL:
   ```bash
   curl -X GET "https://your-project.supabase.co/functions/v1/sheets-oauth?action=auth-url" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. Visit the returned URL and complete authorization

3. Check integration status:
   ```bash
   curl -X GET "https://your-project.supabase.co/functions/v1/sheets-oauth?action=status" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Security Considerations

1. **Token Encryption**: Consider encrypting OAuth tokens in the database
2. **Token Rotation**: Implement regular token rotation
3. **Scope Limitations**: Only request necessary Google Sheets permissions
4. **Rate Limiting**: Implement rate limiting for API calls
5. **Audit Logging**: Log all integration activities

## Production Checklist

- [ ] Google Cloud project configured with proper OAuth consent screen
- [ ] Environment variables set in production Supabase
- [ ] SSL certificates configured for your domain
- [ ] Redirect URIs updated for production domain
- [ ] Edge functions deployed and tested
- [ ] Database migrations applied
- [ ] Error monitoring set up

## API Rate Limits

Google Sheets API has the following limits:
- 300 requests per minute per project
- 100 requests per minute per user

The integration includes exponential backoff to handle rate limiting gracefully.

## Data Format

Entries are synced to Google Sheets with the following columns:
- Date
- Transcript
- Wins
- Regrets
- Tasks
- Keywords
- Sentiment Score
- Created At

Each entry becomes a row in the spreadsheet, with arrays (wins, regrets, tasks, keywords) joined by semicolons.