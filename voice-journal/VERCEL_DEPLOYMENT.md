# Vercel Deployment Guide

Complete guide for deploying Voice Journal to Vercel with proper environment configuration.

## 🚀 Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fphilokalos%2Fvoice-journal)

Or manually:

1. Fork this repository to your GitHub account
2. Visit [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" and import your forked repository
4. Configure environment variables (see below)
5. Deploy!

## 🔧 Environment Variables Setup

### Required Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

#### Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Where to find these:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project → Settings → API
3. Copy "Project URL" and "anon/public" key

### Optional Variables (for advanced features)

#### AI Services
```
VITE_OPENAI_API_KEY=sk-your-openai-key
```

#### Google Integration
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### Notion Integration
```
VITE_NOTION_CLIENT_ID=your-notion-client-id
```

#### Monitoring & Analytics
```
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
```

## 📋 Step-by-Step Setup

### Step 1: Create Supabase Project

1. **Create Project**
   - Go to [supabase.com](https://supabase.com) → "New Project"
   - Name: `voice-journal-prod`
   - Choose your region
   - Generate strong database password

2. **Set Up Database**
   - Go to SQL Editor
   - Run migrations from `supabase/migrations/`
   - Start with `20250715_initial_schema.sql`
   - Then run `20250718_storage_setup.sql`

3. **Configure Authentication**
   - Go to Authentication → Settings
   - Set **Site URL** to your Vercel domain (e.g., `https://voice-journal.vercel.app`)
   - Add your domain to **Redirect URLs**

4. **Enable OAuth Providers**
   - Go to Authentication → Providers
   - Enable Google and/or Apple as needed
   - Add OAuth credentials from respective consoles

### Step 2: Deploy to Vercel

1. **Connect Repository**
   - Import your GitHub repository
   - Vercel will auto-detect it as a Vite project

2. **Configure Build Settings** (auto-detected)
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add the required variables listed above
   - Use "Production", "Preview", and "Development" scopes as needed

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

### Step 3: Configure Domain (Optional)

1. **Custom Domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Supabase URLs**
   - Update Site URL in Supabase to your custom domain
   - Update OAuth redirect URLs

## 🔒 Security Best Practices

### Environment Variable Security

✅ **Do's:**
- Use `VITE_` prefix for client-side variables only
- Keep service role keys in Supabase Edge Functions only
- Use different API keys for production vs development
- Rotate keys regularly

❌ **Don'ts:**
- Never expose service role keys to client
- Don't commit `.env` files to git
- Don't use production keys in development

### Production Checklist

- [ ] All required environment variables set
- [ ] Supabase Site URL matches Vercel domain
- [ ] OAuth redirect URLs configured correctly
- [ ] Database migrations applied
- [ ] RLS policies active and tested
- [ ] Storage buckets created with proper permissions
- [ ] Error monitoring configured (Sentry)

## 🚨 Troubleshooting

### Common Issues

**Build Fails**
```bash
# Check build logs in Vercel dashboard
# Common fixes:
npm run build  # Test locally first
```

**Environment Variables Not Working**
- Ensure `VITE_` prefix for client variables
- Check variable names are exact (case-sensitive)
- Redeploy after adding new variables

**Authentication Errors**
- Verify Site URL in Supabase matches deployment URL
- Check OAuth credentials are correct
- Ensure redirect URLs include the full domain

**Database Connection Issues**
- Verify Supabase URL and anon key
- Check RLS policies allow access
- Ensure migrations were applied

### Getting Help

1. Check Vercel deployment logs
2. Check browser console for client errors
3. Check Supabase logs for backend issues
4. Review this documentation
5. Check [GitHub Issues](https://github.com/philokalos/voice-journal/issues)

## 📊 Monitoring & Analytics

### Built-in Monitoring

Vercel provides:
- Build and deployment logs
- Function execution logs
- Performance analytics
- Error tracking

Access via: Project Dashboard → Functions/Analytics tabs

### Optional: External Monitoring

**Sentry Integration**
```bash
npm install @sentry/react @sentry/vite-plugin
```

Add to environment variables:
```
VITE_SENTRY_DSN=your-sentry-dsn
```

**Google Analytics**
```
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch (production)
- Create pull requests (preview deployments)
- Push to other branches (development deployments)

### Environment-Specific Deployments

- **Production**: `main` branch → production environment variables
- **Preview**: Pull requests → preview environment variables  
- **Development**: Other branches → development environment variables

### Manual Deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy manually
vercel --prod
```

## 📈 Performance Optimization

### Vercel Edge Functions

For AI processing and integrations, consider using Vercel Edge Functions:

```typescript
// api/analyze.ts
export default async function handler(req: Request) {
  // Process with OpenAI API
  // Return structured data
}
```

### Caching Strategy

- Static assets: Cached automatically by Vercel CDN
- API responses: Use appropriate cache headers
- Database queries: Use React Query for client caching

### Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})
```

---

## 📝 Next Steps

After successful deployment:

1. **Test Core Features**
   - User registration/login
   - Basic journaling functionality
   - Data persistence

2. **Configure Monitoring**
   - Set up error tracking
   - Monitor performance metrics
   - Configure alerts

3. **Plan Advanced Features**
   - Voice recording and transcription
   - AI analysis integration
   - Third-party sync (Google Sheets, Notion)

4. **User Testing**
   - Gather feedback from beta users
   - Iterate on UX/UI improvements
   - Monitor usage analytics