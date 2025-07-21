// Environment configuration validation for Firebase-based Voice Journal
export interface AppConfig {
  firebase: {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }
  services: {
    openai?: string
    google?: {
      clientId: string
    }
    notion?: {
      clientId: string
    }
  }
  monitoring: {
    sentry?: string
    analytics?: string
  }
  isDevelopment: boolean
  isProduction: boolean
}

function validateEnvVar(name: string, value: string | undefined, required: boolean = true): string | undefined {
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  if (!value && !required) {
    console.warn(`Optional environment variable not set: ${name}`)
    return undefined
  }
  return value
}

export const config: AppConfig = {
  firebase: {
    apiKey: validateEnvVar('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY)!,
    authDomain: validateEnvVar('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)!,
    projectId: validateEnvVar('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID)!,
    storageBucket: validateEnvVar('VITE_FIREBASE_STORAGE_BUCKET', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET)!,
    messagingSenderId: validateEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID)!,
    appId: validateEnvVar('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID)!
  },
  services: {
    openai: validateEnvVar('VITE_OPENAI_API_KEY', import.meta.env.VITE_OPENAI_API_KEY, false),
    google: import.meta.env.VITE_GOOGLE_CLIENT_ID ? {
      clientId: validateEnvVar('VITE_GOOGLE_CLIENT_ID', import.meta.env.VITE_GOOGLE_CLIENT_ID, false) || ''
    } : undefined,
    notion: import.meta.env.VITE_NOTION_CLIENT_ID ? {
      clientId: validateEnvVar('VITE_NOTION_CLIENT_ID', import.meta.env.VITE_NOTION_CLIENT_ID, false) || ''
    } : undefined
  },
  monitoring: {
    sentry: validateEnvVar('VITE_SENTRY_DSN', import.meta.env.VITE_SENTRY_DSN, false),
    analytics: validateEnvVar('VITE_ANALYTICS_ID', import.meta.env.VITE_ANALYTICS_ID, false)
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
}

// Validate configuration on module load
export function validateConfig(): void {
  try {
    // Validate Firebase configuration
    if (!config.firebase.apiKey.startsWith('AIza')) {
      console.warn('Firebase API key format may be incorrect')
    }
    
    if (!config.firebase.authDomain.endsWith('.firebaseapp.com')) {
      console.warn('Firebase auth domain format may be incorrect')
    }
    
    // Validate optional service configurations
    if (config.services.openai) {
      if (!config.services.openai.startsWith('sk-')) {
        console.warn('OpenAI API key format may be incorrect')
      }
    }
    
    if (config.services.google?.clientId && !config.services.google.clientId.includes('.apps.googleusercontent.com')) {
      console.warn('Google Client ID format may be incorrect')
    }
    
    // Log configuration status
    const enabledServices = []
    if (config.services.openai) enabledServices.push('OpenAI')
    if (config.services.google?.clientId) enabledServices.push('Google')
    if (config.services.notion?.clientId) enabledServices.push('Notion')
    if (config.monitoring.sentry) enabledServices.push('Sentry')
    
    console.log('✅ Firebase configuration validated successfully')
    console.log(`📦 Enabled services: ${enabledServices.join(', ') || 'None (Core only)'}`)
    console.log(`🔥 Firebase project: ${config.firebase.projectId}`)
  } catch (error) {
    console.error('❌ Configuration validation failed:', error)
    throw error
  }
}

// Security check: ensure no secrets are logged
export function getPublicConfig() {
  return {
    firebase: {
      projectId: config.firebase.projectId,
      authDomain: config.firebase.authDomain,
      // Don't expose sensitive keys
      hasApiKey: !!config.firebase.apiKey,
      hasStorageBucket: !!config.firebase.storageBucket
    },
    services: {
      hasOpenAI: !!config.services.openai,
      hasGoogle: !!config.services.google?.clientId,
      hasNotion: !!config.services.notion?.clientId
    },
    monitoring: {
      hasSentry: !!config.monitoring.sentry,
      hasAnalytics: !!config.monitoring.analytics
    },
    environment: config.isDevelopment ? 'development' : 'production'
  }
}

// Auto-validate in development
if (config.isDevelopment) {
  validateConfig()
}