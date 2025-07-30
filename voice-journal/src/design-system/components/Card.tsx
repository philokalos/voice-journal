import React, { forwardRef } from 'react'
import { tokens } from '../tokens'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'glass-strong' | 'solid' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  clickable?: boolean
  as?: React.ElementType
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'glass',
      padding = 'lg',
      hoverable = false,
      clickable = false,
      as: Component = 'div',
      children,
      className = '',
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'glass':
          return {
            background: tokens.colors.glass.bg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${tokens.colors.glass.border}`,
            boxShadow: `${tokens.shadows.glass}, ${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}`,
          }
        case 'glass-strong':
          return {
            background: tokens.colors.glass.bgStrong,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${tokens.colors.glass.border}`,
            boxShadow: `${tokens.shadows.glass}, ${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}`,
          }
        case 'solid':
          return {
            background: 'white',
            border: `1px solid ${tokens.colors.neutral[200]}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }
        case 'elevated':
          return {
            background: 'white',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }
        default:
          return {}
      }
    }

    const getPaddingStyles = () => {
      switch (padding) {
        case 'none':
          return { padding: '0' }
        case 'sm':
          return { padding: tokens.spacing.md }
        case 'md':
          return { padding: tokens.spacing.lg }
        case 'lg':
          return { padding: tokens.spacing.xl }
        case 'xl':
          return { padding: tokens.spacing['2xl'] }
        default:
          return {}
      }
    }

    const baseStyles: React.CSSProperties = {
      borderRadius: tokens.radius.xl,
      transition: `all 0.4s ${tokens.transitions.spring}`,
      cursor: clickable ? 'pointer' : 'default',
      ...getVariantStyles(),
      ...getPaddingStyles(),
      ...style,
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hoverable || clickable) {
        const target = e.currentTarget
        target.style.transform = 'translateY(-1px)'
        
        if (variant === 'glass' || variant === 'glass-strong') {
          target.style.boxShadow = `${tokens.shadows.glassHover}, ${tokens.shadows.neumorphism.light}, ${tokens.shadows.neumorphism.dark}`
          target.style.background = tokens.colors.glass.bgStrong
        } else if (variant === 'solid' || variant === 'elevated') {
          target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }
      }
      onMouseEnter?.(e)
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hoverable || clickable) {
        const target = e.currentTarget
        target.style.transform = 'translateY(0)'
        target.style.boxShadow = baseStyles.boxShadow || 'none'
        
        if (variant === 'glass' || variant === 'glass-strong') {
          target.style.background = (baseStyles.background as string) || ''
        }
      }
      onMouseLeave?.(e)
    }

    return (
      <Component
        ref={ref}
        className={`card-component ${className}`}
        style={baseStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

// Card compound components for better structure
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`card-header ${className}`}
      style={{
        borderBottom: `1px solid ${tokens.colors.glass.border}`,
        paddingBottom: tokens.spacing.lg,
        marginBottom: tokens.spacing.lg,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`card-content ${className}`}
      style={{
        flex: 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`card-footer ${className}`}
      style={{
        borderTop: `1px solid ${tokens.colors.glass.border}`,
        paddingTop: tokens.spacing.lg,
        marginTop: tokens.spacing.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: tokens.spacing.md,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'