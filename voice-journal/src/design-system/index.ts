// Design System Exports
export { tokens } from './tokens'
import { tokens } from './tokens'

// Components
export { Button } from './components/Button'
export type { ButtonProps } from './components/Button'

export { Input } from './components/Input'
export type { InputProps } from './components/Input'

export { Card, CardHeader, CardContent, CardFooter } from './components/Card'
export type { CardProps } from './components/Card'

export { Icon, SpinnerIcon, CheckIcon, XIcon, MicrophoneIcon, PlayIcon, StopIcon, HomeIcon, SettingsIcon, CalendarIcon, TrashIcon, EditIcon } from './components/Icon'
export type { IconProps } from './components/Icon'

export { Badge, StatusBadge } from './components/Badge'
export type { BadgeProps } from './components/Badge'

// Utility functions
export const getResponsiveValue = (mobile: string, desktop: string) => {
  return window.innerWidth <= parseInt(tokens.breakpoints.mobile) ? mobile : desktop
}

export const getSpacing = (key: keyof typeof tokens.spacing) => tokens.spacing[key]

export const getColor = (key: string) => {
  // Helper to get nested color values like 'neutral.500'
  const keys = key.split('.')
  let value: any = tokens.colors
  
  for (const k of keys) {
    value = value[k]
    if (!value) return undefined
  }
  
  return value
}

export const getTypographySize = (key: keyof typeof tokens.typography.sizes) => tokens.typography.sizes[key]

export const getBorderRadius = (key: keyof typeof tokens.radius) => tokens.radius[key]

// Theme utilities
export const createGlassEffect = (opacity = 0.08) => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${tokens.colors.glass.border}`,
})

export const createGradientBackground = (from = tokens.colors.primary, to = tokens.colors.secondary) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
})

export const createShadowEffect = (level: 'sm' | 'md' | 'lg' = 'md') => {
  switch (level) {
    case 'sm':
      return { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }
    case 'md':
      return { boxShadow: tokens.shadows.glass }
    case 'lg':
      return { boxShadow: tokens.shadows.glassHover }
    default:
      return {}
  }
}