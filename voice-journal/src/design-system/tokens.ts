/**
 * Design System Tokens
 * Central configuration for colors, spacing, typography, and other design values
 */

export const tokens = {
  // Colors
  colors: {
    primary: '#6366f1',
    primaryMuted: '#a5b4fc',
    secondary: '#8b5cf6',
    
    // Neutral scale
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    
    // Semantic colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Glass system
    glass: {
      bg: 'rgba(255, 255, 255, 0.08)',
      bgStrong: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.18)',
    },
  },

  // Spacing (8px grid system)
  spacing: {
    xs: '6px',
    sm: '12px',
    md: '24px',
    lg: '36px',
    xl: '48px',
    '2xl': '60px',
    '3xl': '72px',
    '4xl': '96px',
    '5xl': '120px',
  },

  // Typography
  typography: {
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.3,
      base: 1.6,
      relaxed: 1.7,
    },
  },

  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    glass: '0 20px 40px rgba(0, 0, 0, 0.08)',
    glassHover: '0 25px 50px rgba(0, 0, 0, 0.12)',
    neumorphism: {
      light: 'inset 1px 1px 2px rgba(255, 255, 255, 0.3)',
      dark: 'inset -1px -1px 2px rgba(0, 0, 0, 0.1)',
    },
  },

  // Transitions
  transitions: {
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Component sizes
  components: {
    button: {
      height: '48px',
      heightMobile: '52px',
    },
    input: {
      height: '48px',
      heightMobile: '52px',
    },
    icon: {
      standard: '20px',
      large: '24px',
    },
    touchTarget: {
      minimum: '44px',
    },
  },

  // Breakpoints
  breakpoints: {
    mobile: '640px',
    tablet: '1024px',
  },

  // Z-index scale
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    navigation: 50,
  },
} as const

// Utility types for TypeScript
export type ColorKey = keyof typeof tokens.colors
export type SpacingKey = keyof typeof tokens.spacing
export type TypographySizeKey = keyof typeof tokens.typography.sizes
export type RadiusKey = keyof typeof tokens.radius