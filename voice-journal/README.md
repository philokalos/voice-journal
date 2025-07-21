# 🎙️ Voice Journal - Production Ready

A mobile-first journaling assistant that lets users speak about their day, automatically transcribes audio, and extracts key reflections for organized self-improvement.

## 📊 Project Status

[![Deploy to Production](https://github.com/philokalos/voice-journal/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/philokalos/voice-journal/actions/workflows/deploy.yml)
[![Deploy to Staging](https://github.com/philokalos/voice-journal/actions/workflows/deploy.yml/badge.svg?branch=staging)](https://github.com/philokalos/voice-journal/actions/workflows/deploy.yml)
[![Vercel](https://img.shields.io/badge/vercel-deployed-brightgreen)](https://voice-journal.vercel.app)
[![TypeScript](https://img.shields.io/badge/typescript-100%25-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

| Environment | Status | URL | Branch |
|-------------|--------|-----|--------|
| 🚀 Production | [![Production](https://img.shields.io/badge/status-live-green)](https://voice-journal.vercel.app) | [voice-journal.vercel.app](https://voice-journal.vercel.app) | `main` |
| 🧪 Staging | [![Staging](https://img.shields.io/badge/status-live-yellow)](https://voice-journal-staging.vercel.app) | [voice-journal-staging.vercel.app](https://voice-journal-staging.vercel.app) | `staging` |

## ✨ Features

- **One-Tap Voice Recording**: Simple interface for quick daily reflections
- **AI-Powered Analysis**: Automatic extraction of wins, regrets, tasks, and keywords
- **Secure Authentication**: Email/password and Google OAuth via Firebase Auth
- **Progressive Web App**: Install on mobile devices like a native app
- **Audit Logging**: Complete traceability of all data changes for compliance
- **Data Ownership**: Export to Google Sheets, Notion, or CSV
- **Privacy-First**: End-to-end encryption for audio files

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account and project
- (Optional) OpenAI API key for AI features

### Local Development

1. **Clone and Install**
   ```bash
   git clone https://github.com/philokalos/voice-journal.git
   cd voice-journal
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Enable Storage
   - Copy your config values to `.env.local`

4. **Start Development Server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to see the app.

## 🔧 Environment Variables

### Required (Core Functionality)

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234567890
```

### Optional (Advanced Features)

```env
# AI Services
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# OAuth Integrations
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_NOTION_CLIENT_ID=your-notion-client-id

# Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
```

**Getting API Keys:**
- **Firebase**: [console.firebase.google.com](https://console.firebase.google.com) → Project Settings → General → Your apps
- **OpenAI**: [platform.openai.com](https://platform.openai.com) → API Keys
- **Google**: [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials

## 📱 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fphilokalos%2Fvoice-journal)

Or manually:

1. Fork this repository
2. Connect to [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Deploy!

**Detailed deployment guide:** [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

### Self-Hosting

```bash
# Build for production
npm run build

# Preview locally
npm run preview

# Deploy to any static hosting service
# Upload the 'dist' folder
```

## 🏗️ Project Structure

```
voice-journal/
├── src/
│   ├── components/         # Shared UI components
│   ├── domains/           # Feature domains
│   │   ├── auth/          # Authentication
│   │   └── journaling/    # Core journaling features
│   ├── lib/               # Utilities and configuration
│   ├── pages/             # Route components
│   └── shared/            # Shared types and constants
├── supabase/
│   ├── migrations/        # Database schema
│   └── functions/         # Edge functions
└── scripts/               # Build and utility scripts
```

## 🔒 Security

### Environment Variables

- ✅ All client-side variables use `VITE_` prefix
- ✅ Server secrets are kept in Supabase Edge Functions
- ✅ Automatic secret scanning in build process
- ✅ No hardcoded API keys in source code

### Database Security

- ✅ Row Level Security (RLS) enabled
- ✅ User data isolation enforced
- ✅ Private storage buckets for audio files
- ✅ Proper OAuth redirect validation

### Privacy Compliance

- ✅ GDPR/CCPA compliant data handling
- ✅ User data export functionality
- ✅ Clear data deletion process
- ✅ End-to-end encryption for sensitive data

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production (with security checks)
npm run build:unsafe # Build without security checks (CI only)
npm run lint         # Run ESLint
npm run preview      # Preview production build
npm run check:secrets # Scan for exposed secrets
```

### Testing

```bash
# Run security audit
npm audit

# Check for vulnerable packages
npm run check:secrets

# Type checking
npx tsc --noEmit
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting (coming soon)
- **Husky**: Git hooks for quality gates (coming soon)

## 📊 Monitoring

### Built-in Monitoring

- Vercel Analytics (deployment metrics)
- Firebase Console (database, auth, and functions)
- Browser Console (client-side errors)

### Optional External Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior analytics
- **Lighthouse CI**: Performance auditing

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation

### Backend
- **Firebase** for database, auth, and storage
- **Firestore** with security rules
- **Firebase Cloud Functions** for serverless compute and audit logging

### DevOps
- **Vercel** for hosting and CI/CD
- **GitHub Actions** for automated testing
- **Firebase CLI** for local development and deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and security checks (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure security checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [voice-journal.vercel.app](https://voice-journal.vercel.app)
- **Documentation**: [/docs](./docs)
- **Issues**: [GitHub Issues](https://github.com/philokalos/voice-journal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/philokalos/voice-journal/discussions)

## 💡 Roadmap

### Phase 1 (Current - MVP)
- [x] Basic text journaling
- [x] User authentication
- [x] Data export
- [x] PWA functionality

### Phase 2 (Next)
- [ ] Voice recording and transcription
- [ ] AI-powered analysis
- [ ] Google Sheets integration
- [ ] Notion integration

### Phase 3 (Future)
- [ ] Advanced analytics
- [ ] Habit tracking
- [ ] Social features
- [ ] Enterprise features

---

**Made with ❤️ by the Voice Journal team**

*Helping people reflect, grow, and organize their lives through effortless voice journaling.*