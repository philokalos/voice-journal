import React from 'react'
import { tokens } from '../tokens'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  dot = false,
  children,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: `${tokens.colors.primary}20`,
          color: tokens.colors.primary,
          border: `1px solid ${tokens.colors.primary}40`,
        }
      case 'secondary':
        return {
          backgroundColor: `${tokens.colors.secondary}20`,
          color: tokens.colors.secondary,
          border: `1px solid ${tokens.colors.secondary}40`,
        }
      case 'success':
        return {
          backgroundColor: `${tokens.colors.success}20`,
          color: tokens.colors.success,
          border: `1px solid ${tokens.colors.success}40`,
        }
      case 'warning':
        return {
          backgroundColor: `${tokens.colors.warning}20`,
          color: tokens.colors.warning,
          border: `1px solid ${tokens.colors.warning}40`,
        }
      case 'error':
        return {
          backgroundColor: `${tokens.colors.error}20`,
          color: tokens.colors.error,
          border: `1px solid ${tokens.colors.error}40`,
        }
      case 'info':
        return {
          backgroundColor: `${tokens.colors.info}20`,
          color: tokens.colors.info,
          border: `1px solid ${tokens.colors.info}40`,
        }
      case 'neutral':
        return {
          backgroundColor: `${tokens.colors.neutral[300]}40`,
          color: tokens.colors.neutral[700],
          border: `1px solid ${tokens.colors.neutral[300]}`,
        }
      default:
        return {}
    }
  }

  const getSizeStyles = () => {
    if (dot) {
      switch (size) {
        case 'sm':
          return {
            width: '8px',
            height: '8px',
          }
        case 'md':
          return {
            width: '10px',
            height: '10px',
          }
        case 'lg':
          return {
            width: '12px',
            height: '12px',
          }
        default:
          return {}
      }
    }

    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          fontSize: tokens.typography.sizes.xs,
          height: '20px',
        }
      case 'md':
        return {
          padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
          fontSize: tokens.typography.sizes.xs,
          height: '24px',
        }
      case 'lg':
        return {
          padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
          fontSize: tokens.typography.sizes.sm,
          height: '28px',
        }
      default:
        return {}
    }
  }

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: dot ? tokens.radius.full : tokens.radius.sm,
    fontWeight: tokens.typography.weights.medium,
    whiteSpace: 'nowrap',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  }

  if (dot) {
    return (
      <span
        className={`badge-component badge-dot ${className}`}
        style={baseStyles}
        {...props}
      />
    )
  }

  return (
    <span
      className={`badge-component ${className}`}
      style={baseStyles}
      {...props}
    >
      {children}
    </span>
  )
}

// Status-specific badge components
export const StatusBadge: React.FC<Omit<BadgeProps, 'variant'> & { status: 'online' | 'offline' | 'syncing' | 'error' }> = ({
  status,
  ...props
}) => {
  const getStatusVariant = () => {
    switch (status) {
      case 'online':
        return 'success'
      case 'offline':
        return 'neutral'
      case 'syncing':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return '온라인'
      case 'offline':
        return '오프라인'
      case 'syncing':
        return '동기화 중'
      case 'error':
        return '오류'
      default:
        return status
    }
  }

  return (
    <Badge variant={getStatusVariant() as any} {...props}>
      {getStatusText()}
    </Badge>
  )
}