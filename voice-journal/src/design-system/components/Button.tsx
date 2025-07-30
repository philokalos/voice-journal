import React, { forwardRef } from 'react'
import { tokens } from '../tokens'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`,
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: `${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}, 0 4px 12px rgba(99, 102, 241, 0.2)`,
          }
        case 'secondary':
          return {
            background: tokens.colors.glass.bg,
            color: tokens.colors.neutral[700],
            border: `1px solid ${tokens.colors.glass.border}`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }
        case 'ghost':
          return {
            background: 'transparent',
            color: tokens.colors.neutral[600],
            border: 'none',
          }
        case 'glass':
          return {
            background: tokens.colors.glass.bg,
            color: tokens.colors.neutral[700],
            border: `1px solid ${tokens.colors.glass.border}`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: `${tokens.shadows.glass}, ${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}`,
          }
        case 'danger':
          return {
            background: `linear-gradient(135deg, ${tokens.colors.error}, #dc2626)`,
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: `${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}, 0 4px 12px rgba(239, 68, 68, 0.2)`,
          }
        default:
          return {}
      }
    }

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return {
            height: '40px',
            padding: `0 ${tokens.spacing.lg}`,
            fontSize: tokens.typography.sizes.sm,
          }
        case 'md':
          return {
            height: tokens.components.button.height,
            padding: `0 ${tokens.spacing.xl}`,
            fontSize: tokens.typography.sizes.base,
          }
        case 'lg':
          return {
            height: '56px',
            padding: `0 ${tokens.spacing['2xl']}`,
            fontSize: tokens.typography.sizes.lg,
          }
        default:
          return {}
      }
    }

    const baseStyles: React.CSSProperties = {
      borderRadius: tokens.radius.md,
      fontWeight: tokens.typography.weights.medium,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      transition: `all 0.4s ${tokens.transitions.spring}`,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      border: 'none',
      textDecoration: 'none',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled || loading ? 0.5 : 1,
      minHeight: tokens.components.touchTarget.minimum,
      ...getSizeStyles(),
      ...getVariantStyles(),
      ...style,
    }

    const LoadingSpinner = () => (
      <svg 
        className="animate-spin" 
        style={{ width: tokens.components.icon.standard, height: tokens.components.icon.standard }} 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )

    const IconWrapper = ({ children }: { children: React.ReactNode }) => (
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {children}
      </span>
    )

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`button-component ${className}`}
        style={baseStyles}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            const target = e.currentTarget
            target.style.transform = 'translateY(-1px) scale(1.02)'
            if (variant === 'primary') {
              target.style.boxShadow = `${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}, 0 8px 25px rgba(99, 102, 241, 0.3)`
              target.style.filter = 'brightness(1.05)'
            } else if (variant === 'glass' || variant === 'secondary') {
              target.style.transform = 'translateY(-1px)'
              target.style.boxShadow = `${tokens.shadows.glassHover}, ${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}`
              target.style.background = tokens.colors.glass.bgStrong
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            const target = e.currentTarget
            target.style.transform = 'none'
            target.style.boxShadow = baseStyles.boxShadow || 'none'
            target.style.filter = 'none'
            if (variant === 'glass' || variant === 'secondary') {
              target.style.background = (baseStyles.background as string) || ''
            }
          }
        }}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === 'left' && <IconWrapper>{icon}</IconWrapper>}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'right' && <IconWrapper>{icon}</IconWrapper>}
      </button>
    )
  }
)

Button.displayName = 'Button'