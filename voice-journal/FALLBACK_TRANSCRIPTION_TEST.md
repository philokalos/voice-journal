# Fallback Transcription Testing Guide

## 🎯 Overview

This document outlines how to test the fallback transcription system that uses Google Cloud Speech-to-Text API as a backup when Web Speech API fails or produces low-quality results.

## 🏗️ Architecture

```
┌─ Voice Recording ─┐
│                   │
│  Web Speech API   │ ← Primary transcription
│  (Browser-based) │
│                   │
└─────────┬─────────┘
          │
          │ (if fails or low quality)
          ▼
┌─ Fallback System ─┐
│                   │
│  1. Audio Upload  │ ← Store in Supabase Storage
│  2. Edge Function │ ← Trigger fallback-transcribe
│  3. Google Cloud  │ ← Cloud Speech-to-Text API
│  4. Update Entry  │ ← Store result in database
│                   │
└───────────────────┘
```

## 🔧 Prerequisites

### 1. Environment Variables

**Client-side (.env.local):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Server-side (Supabase Edge Function Environment):**
```env
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Setup

Run the migration to add fallback transcription fields:
```sql
-- Already included in: supabase/migrations/20250718_add_fallback_transcription_fields.sql
```

### 3. Google Cloud Setup

1. Enable Speech-to-Text API in Google Cloud Console
2. Create API key with Speech-to-Text API access
3. Add the API key to Supabase Edge Function environment variables

## 🧪 Testing Scenarios

### Test 1: Web Speech API Success (No Fallback Needed)

**Expected Behavior:**
- Record voice with clear audio
- Web Speech API produces high-confidence transcript
- No fallback is triggered
- Entry saved with `transcript_source: 'web_speech'`

**Steps:**
1. Open Voice Journal app
2. Switch to Voice mode
3. Record clear, audible speech (10-15 seconds)
4. Verify transcript appears with good quality
5. Save entry
6. Check that entry shows "🎤 Voice" badge

### Test 2: Web Speech API Failure (Fallback Triggered)

**Expected Behavior:**
- Web Speech API fails or produces gibberish
- System automatically triggers fallback transcription
- Google Cloud Speech-to-Text processes the audio
- Entry updated with fallback transcript

**Steps:**
1. Simulate poor Web Speech API results by:
   - Speaking very quietly (low confidence)
   - Speaking gibberish or random syllables
   - Using unsupported browser features
2. Record audio
3. Observe fallback transcription attempt
4. Verify improved transcript from Google Cloud
5. Check database for `transcript_fallback` field

### Test 3: Manual Fallback Trigger

**Expected Behavior:**
- User can manually request better transcription
- System calls fallback service directly
- Results replace original transcript

**Steps:**
1. Record voice entry with mediocre results
2. Click "Try server-side transcription" button
3. Wait for processing
4. Verify improved transcript quality

### Test 4: Quality Detection Algorithm

**Test Cases:**
```javascript
// No transcript - should trigger fallback
checkTranscriptionQuality(null) 
// → { needsFallback: true, reason: 'no_transcript' }

// Very short transcript - should trigger fallback  
checkTranscriptionQuality("hi")
// → { needsFallback: true, reason: 'transcript_too_short' }

// Low confidence - should trigger fallback
checkTranscriptionQuality("hello world", 0.3)
// → { needsFallback: true, reason: 'low_confidence' }

// Gibberish - should trigger fallback
checkTranscriptionQuality("a b c d e f g h i j")
// → { needsFallback: true, reason: 'gibberish_detected' }

// Good transcript - no fallback needed
checkTranscriptionQuality("Today was a great day at work", 0.9)
// → { needsFallback: false }
```

### Test 5: Error Handling

**Test Scenarios:**
- Invalid Google Cloud API key
- Network connection failure
- Audio file too large/corrupt
- User authentication failure

**Expected Behavior:**
- Graceful error handling
- Informative error messages
- Fallback to original transcript when possible
- Proper logging for debugging

## 🔍 Manual Testing Steps

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start Supabase (if using local development)
supabase start
```

### 2. Test Voice Recording

1. **Navigate to Dashboard**
   - Go to http://localhost:5173
   - Login with test account
   - Switch to Voice mode

2. **Test Clear Audio (Good Path)**
   ```
   Expected: Web Speech API → High confidence → No fallback needed
   ```
   - Speak clearly: "Today I had a productive meeting with my team"
   - Verify transcript accuracy
   - Check that confidence > 0.7
   - Save entry

3. **Test Poor Audio (Fallback Path)**
   ```
   Expected: Web Speech API → Low confidence → Fallback triggered
   ```
   - Speak very quietly or mumble
   - Or speak random syllables: "bla bla xyz qwerty"
   - Verify fallback attempt is made
   - Check for improved transcript

### 3. Test Edge Function Directly

```bash
# Test the fallback transcription Edge Function
curl -X POST 'https://your-project.supabase.co/functions/v1/fallback-transcribe' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "entryId": "test-entry-123",
    "audioUrl": "https://your-storage-url/test-audio.webm",
    "userId": "user-uuid",
    "language": "en"
  }'
```

### 4. Database Verification

```sql
-- Check entries with fallback transcription
SELECT 
  id,
  transcript,
  transcript_fallback,
  transcript_confidence,
  transcript_source,
  fallback_processing_time
FROM entries 
WHERE transcript_fallback IS NOT NULL;

-- Check transcription logs
SELECT 
  transcription_type,
  success,
  error_message,
  processing_time_ms,
  confidence_score
FROM transcription_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📊 Success Criteria

### ✅ Functional Requirements

- [ ] Web Speech API works for good quality audio
- [ ] Fallback automatically triggers for poor quality audio
- [ ] Google Cloud Speech-to-Text produces better results
- [ ] Database properly stores both original and fallback transcripts
- [ ] User can manually trigger fallback transcription
- [ ] Error handling is graceful and informative

### ✅ Performance Requirements

- [ ] Fallback transcription completes within 10 seconds for 60-second audio
- [ ] Quality detection algorithm runs in < 100ms
- [ ] Audio upload completes within 5 seconds for typical recordings
- [ ] UI remains responsive during processing

### ✅ Quality Requirements

- [ ] Fallback transcription accuracy > 90% for clear English speech
- [ ] Quality detection correctly identifies poor transcripts > 85% of time
- [ ] System handles Korean language (if configured)
- [ ] Confidence scores are reliable indicators of quality

## 🐛 Common Issues and Solutions

### Issue: "Google Cloud API key not configured"
**Solution:** Set `GOOGLE_CLOUD_API_KEY` in Supabase Edge Function environment

### Issue: "Authentication required for fallback transcription"
**Solution:** Ensure user is logged in and session is valid

### Issue: "Audio upload failed"
**Solution:** Check Supabase Storage bucket permissions and file size limits

### Issue: "Web Speech API not supported"
**Solution:** Test in Chrome/Edge. Safari has limited support.

### Issue: Fallback never triggers
**Solution:** Manually set low confidence or use quality detection test cases

## 📈 Monitoring and Metrics

### Key Metrics to Track

1. **Fallback Trigger Rate:** % of entries that require fallback
2. **Fallback Success Rate:** % of fallback attempts that succeed  
3. **Quality Improvement:** Confidence score improvement with fallback
4. **Processing Time:** Average time for fallback transcription
5. **Error Rate:** % of transcription attempts that fail completely

### Logging Points

```javascript
// Client-side logging
console.log('Voice recording started')
console.log('Web Speech result:', { transcript, confidence })
console.log('Quality check:', { needsFallback, reason })
console.log('Fallback attempt:', { success, processingTime })

// Server-side logging (Edge Function)
console.log('Fallback transcription request:', { entryId, language })
console.log('Google Cloud API response:', { confidence, duration })
console.log('Database update:', { success, error })
```

## 🎯 Next Steps

After successful testing:

1. **Deploy to Production**
   - Set up production Google Cloud API key
   - Configure Supabase environment variables
   - Deploy Edge Functions

2. **Monitor Performance**
   - Set up alerting for high error rates
   - Track fallback usage patterns
   - Monitor API costs

3. **Optimize Quality Detection**
   - Tune confidence thresholds based on real usage
   - Add language-specific detection rules
   - Implement user feedback collection

4. **Add Advanced Features**
   - Multi-language support
   - Real-time quality indicators
   - Batch processing for multiple files
   - Integration with AI analysis pipeline

---

This fallback transcription system provides a robust foundation for high-quality voice journaling with automatic quality improvement and graceful error handling.