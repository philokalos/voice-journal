# AI Analysis Setup Guide

This guide will help you set up the AI-powered reflection extraction feature for Voice Journal.

## Prerequisites

1. A Supabase project with the database already set up (see DATABASE_SETUP.md)
2. An OpenAI API account and API key
3. Supabase CLI installed (optional, for local development)

## OpenAI API Setup

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Navigate to **API Keys** in the left sidebar
4. Click **Create new secret key**
5. Copy the generated API key (starts with `sk-`)

### Step 2: Add API Key to Supabase

#### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings > Edge Functions**
3. Click on **Environment Variables**
4. Add a new variable:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

#### Option B: Using Supabase CLI

```bash
# Set the environment variable
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## Deploy the Edge Function

### Method 1: Using Supabase CLI (Recommended)

```bash
# Deploy the analysis function
supabase functions deploy analysis

# Verify deployment
supabase functions list
```

### Method 2: Manual Deployment

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **Create Function**
4. Name: `analysis`
5. Copy the contents of `supabase/functions/analysis/index.ts`
6. Paste into the editor and save

## Environment Variables

Make sure your `.env` file includes:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing the AI Analysis

### Method 1: Using the Application

1. Start the development server: `npm run dev`
2. Sign up/sign in to the application
3. Record a voice journal entry
4. The AI analysis will run automatically after saving

### Method 2: Manual Testing

You can test the Edge Function directly:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{
    "entryId": "your-entry-id",
    "transcript": "Today was a good day. I finished my project on time and helped a colleague with their work. However, I forgot to call my mom back. Tomorrow I need to schedule a team meeting and review the budget."
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": {
    "wins": ["Finished project on time", "Helped a colleague"],
    "regrets": ["Forgot to call mom back"],
    "tasks": ["Schedule team meeting", "Review budget"],
    "keywords": ["project", "colleague", "meeting", "budget"],
    "sentiment_score": 0.6
  }
}
```

## Monitoring and Troubleshooting

### View Function Logs

```bash
# View real-time logs
supabase functions logs analysis

# View logs from Supabase dashboard
# Go to Edge Functions > analysis > Logs
```

### Common Issues

1. **"OpenAI API key not configured"**
   - Ensure you've added the `OPENAI_API_KEY` environment variable
   - Redeploy the function after adding the key

2. **"Unauthorized" error**
   - Make sure the user is authenticated
   - Check that the JWT token is valid

3. **"Entry not found or unauthorized"**
   - Verify the entry ID exists
   - Ensure the entry belongs to the authenticated user

4. **OpenAI API rate limits**
   - The function includes basic error handling
   - Consider implementing exponential backoff for production

### Cost Optimization

The AI analysis uses GPT-3.5-turbo with optimized settings:
- Max tokens: 800
- Temperature: 0.3 (for consistent results)
- Estimated cost: ~$0.001-0.002 per analysis

For production, consider:
- Batch processing multiple entries
- Caching results to avoid re-analysis
- Using GPT-4 only for complex entries

## Production Considerations

1. **Rate Limiting**: Implement rate limiting to prevent abuse
2. **Error Handling**: Add retry logic with exponential backoff
3. **Monitoring**: Set up alerts for function failures
4. **Caching**: Cache analysis results to reduce API calls
5. **Fallbacks**: Implement fallback analysis for API failures

## Alternative AI Providers

The system is designed to be extensible. You can replace OpenAI with:

- **Google Cloud Natural Language API**
- **Azure Cognitive Services**
- **AWS Comprehend**
- **Anthropic Claude**

Simply modify the `analyzeWithOpenAI` function in `supabase/functions/analysis/index.ts` to use your preferred provider.