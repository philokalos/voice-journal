# Firebase Setup Guide

Firebase provides optional advanced features for Voice Journal. This guide shows how to set up Firebase alongside the primary Supabase backend.

## 🎯 Overview

Voice Journal uses **Supabase as the primary backend** for all core features:
- ✅ Authentication (Email, Google, Apple)  
- ✅ Database (PostgreSQL with RLS)
- ✅ File Storage (Private audio files)
- ✅ Realtime updates

**Firebase is optional** and provides supplementary features:
- 🔄 Additional storage for large files
- 🔄 Advanced analytics and performance monitoring  
- ⏳ Cloud Functions for heavy processing
- ⏳ Push notifications (future)

## 🚀 Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Project details:
   - **Name**: `voice-journal-prod`
   - **Analytics**: Enable for user insights
   - **Region**: Match your Supabase region

### Step 2: Configure Services

#### Storage (Primary Use Case)
```
1. Storage → Get started
2. Security rules: Start in test mode  
3. Location: Choose your region
4. Create bucket: voice-journal-storage
```

#### Analytics
```
1. Analytics → Get started
2. Google Analytics account: Create or select
3. Data sharing: Configure per your privacy policy
```

#### Cloud Functions (Future)
```
1. Functions → Get started
2. Billing: Upgrade to Blaze plan
3. Location: Choose your region
```

### Step 3: Get Configuration

1. **Project Settings** (gear icon) → **General**
2. **Your apps** → **Web app**
3. Copy the configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBOyYyRGj...",
  authDomain: "voice-journal.firebaseapp.com",
  projectId: "voice-journal",
  storageBucket: "voice-journal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 🔧 Environment Setup

### Development (.env.local)

```env
# Firebase Configuration (Optional)
VITE_FIREBASE_API_KEY=AIzaSyBOyYyRGj...
VITE_FIREBASE_AUTH_DOMAIN=voice-journal.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voice-journal
VITE_FIREBASE_STORAGE_BUCKET=voice-journal.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Production (Vercel)

Add the same variables to Vercel:
1. Project Settings → Environment Variables
2. Add each `VITE_FIREBASE_*` variable
3. Redeploy to apply changes

## 🛡️ Security Rules

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User-specific audio files and exports
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == userId;
    }
    
    // Public assets (app icons, etc.)
    match /public/{allPaths=**} {
      allow read: if true;
    }
  }
}
```

## 📱 Usage Examples

### Check Firebase Availability

```typescript
import { isFirebaseAvailable } from './lib/firebase';

if (isFirebaseAvailable()) {
  console.log('🔥 Firebase ready for advanced features');
} else {
  console.log('📝 Running with Supabase only (recommended for MVP)');
}
```

### File Upload with Fallback

```typescript
import { getFirebaseStorage, isFirebaseAvailable } from './lib/firebase';
import { supabase } from './lib/supabase';

async function uploadLargeFile(file: File, userId: string) {
  try {
    if (isFirebaseAvailable() && file.size > 10 * 1024 * 1024) {
      // Use Firebase for files > 10MB
      const storage = getFirebaseStorage();
      const ref = storageRef(storage, `users/${userId}/large/${file.name}`);
      const snapshot = await uploadBytes(ref, file);
      return getDownloadURL(snapshot.ref);
    } else {
      // Use Supabase for normal files
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(`${userId}/${file.name}`, file);
      
      if (error) throw error;
      return data.path;
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Analytics Tracking

```typescript
import { getAnalytics, logEvent } from 'firebase/analytics';
import { firebaseApp } from './lib/firebase';

// Track custom events
if (firebaseApp) {
  const analytics = getAnalytics(firebaseApp);
  
  logEvent(analytics, 'journal_entry_created', {
    method: 'voice',
    has_audio: true,
    processing_time: 1200
  });
}
```

## 🏗️ Architecture Overview

```
┌─ Voice Journal Architecture ─┐
│                              │
│  Frontend (React + Vite)     │
│         │                    │
│         ├─ Primary: Supabase │
│         │  ├─ Auth ✅        │
│         │  ├─ Database ✅    │  
│         │  ├─ Storage ✅     │
│         │  └─ Realtime ✅    │
│         │                    │
│         └─ Optional: Firebase│
│            ├─ Storage 🔄     │
│            ├─ Analytics 🔄   │
│            └─ Functions ⏳   │
│                              │
└──────────────────────────────┘
```

## 🧪 Testing

### Local Testing

```bash
# Test with Firebase
VITE_FIREBASE_API_KEY=your-key npm run dev

# Test without Firebase (default)
npm run dev
```

### Verify Setup

1. **Check Console**: Look for Firebase initialization logs
2. **Test Upload**: Try uploading a large file  
3. **Check Analytics**: Visit Firebase Console → Analytics
4. **Monitor Errors**: Watch for configuration issues

## 🚨 Common Issues

### Firebase Not Loading
```
❌ Error: Firebase not configured
✅ Solution: Add VITE_FIREBASE_* environment variables
```

### Storage Upload Fails
```
❌ Error: Storage upload permission denied
✅ Solution: Check security rules and authentication
```

### Analytics Not Tracking
```
❌ Error: Events not appearing
✅ Solution: Verify Analytics is enabled and app_id is correct
```

## 💰 Cost Optimization

### Firebase Pricing Tiers

**Spark Plan (Free)**
- Storage: 1GB
- Analytics: Unlimited
- Functions: 125K invocations/month

**Blaze Plan (Pay-as-you-go)**
- Storage: $0.026/GB/month
- Functions: $0.40/million invocations
- Analytics: Free

### Recommendations

1. **Start with Spark Plan** for development
2. **Monitor usage** in Firebase Console
3. **Set billing alerts** before production
4. **Use Supabase as primary** to minimize Firebase costs

## 📊 Monitoring

### Firebase Console
- **Storage**: Upload/download metrics
- **Analytics**: User behavior insights  
- **Performance**: App loading times

### Integration Monitoring
- **Supabase**: Primary metrics and logs
- **Firebase**: Supplementary analytics
- **Vercel**: Deployment and performance

---

## 🎯 Next Steps

1. **MVP Deployment**: Use Supabase only
2. **Add Analytics**: Configure Firebase Analytics
3. **Large File Support**: Implement Firebase Storage
4. **Advanced Features**: Add Cloud Functions as needed

Firebase enhances Voice Journal's capabilities while keeping Supabase as the reliable foundation.