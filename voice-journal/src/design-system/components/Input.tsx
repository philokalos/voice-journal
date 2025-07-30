import React, { forwardRef } from 'react'
import { tokens } from '../tokens'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  variant?: 'default' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  helperText?: string
  error?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  multiline?: boolean
  rows?: number
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      variant = 'glass',
      size = 'md',
      label,
      helperText,
      error,
      icon,
      iconPosition = 'left',
      multiline = false,
      rows = 4,
      fullWidth = true,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'glass':
          return {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }
        case 'default':
          return {
            background: 'white',
            border: `1px solid ${tokens.colors.neutral[300]}`,
          }
        default:
          return {}
      }
    }

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return {
            height: multiline ? 'auto' : '40px',
            minHeight: multiline ? '80px' : '40px',
            padding: multiline ? tokens.spacing.md : `0 ${tokens.spacing.md}`,
            fontSize: tokens.typography.sizes.sm,
          }
        case 'md':
          return {
            height: multiline ? 'auto' : tokens.components.input.height,
            minHeight: multiline ? '120px' : tokens.components.input.height,
            padding: multiline ? tokens.spacing.lg : `0 ${tokens.spacing.md}`,
            fontSize: tokens.typography.sizes.base,
          }
        case 'lg':
          return {
            height: multiline ? 'auto' : '56px',
            minHeight: multiline ? '140px' : '56px',
            padding: multiline ? tokens.spacing.xl : `0 ${tokens.spacing.lg}`,
            fontSize: tokens.typography.sizes.lg,
          }
        default:
          return {}
      }
    }

    const baseStyles: React.CSSProperties = {
      borderRadius: tokens.radius.md,
      display: 'flex',
      alignItems: multiline ? 'flex-start' : 'center',
      transition: 'all 0.3s ease',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'inherit',
      outline: 'none',
      resize: multiline ? 'none' : undefined,
      ...getSizeStyles(),
      ...getVariantStyles(),
      ...style,
    }

    const focusStyles: React.CSSProperties = {
      background: 'rgba(255, 255, 255, 0.95)',
      borderColor: `rgba(102, 126, 234, 0.5)`,
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
      transform: 'translateY(-1px)',
    }

    const errorStyles: React.CSSProperties = {
      borderColor: tokens.colors.error,
      boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.1)`,
    }

    const inputStyles = {
      ...baseStyles,
      ...(error ? errorStyles : {}),
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!disabled) {
        Object.assign(e.currentTarget.style, focusStyles)
      }
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      Object.assign(e.currentTarget.style, baseStyles)
      if (error) {
        Object.assign(e.currentTarget.style, errorStyles)
      }
      props.onBlur?.(e)
    }

    const InputComponent = multiline ? 'textarea' : 'input'

    return (
      <div className={`input-wrapper ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            style={{
              display: 'block',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.neutral[700],
              marginBottom: tokens.spacing.xs,
            }}
          >
            {label}
            {props.required && (
              <span style={{ color: tokens.colors.error, marginLeft: '2px' }}>*</span>
            )}
          </label>
        )}
        
        <div style={{ position: 'relative', width: '100%' }}>
          {icon && iconPosition === 'left' && (
            <div
              style={{
                position: 'absolute',
                left: tokens.spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: tokens.zIndex.base,
                color: tokens.colors.neutral[500],
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
          )}
          
          <InputComponent
            ref={ref as any}
            disabled={disabled}
            rows={multiline ? rows : undefined}
            style={{
              ...inputStyles,
              paddingLeft: icon && iconPosition === 'left' 
                ? `calc(${tokens.spacing.md} + ${tokens.components.icon.standard} + ${tokens.spacing.sm})` 
                : inputStyles.padding,
              paddingRight: icon && iconPosition === 'right' 
                ? `calc(${tokens.spacing.md} + ${tokens.components.icon.standard} + ${tokens.spacing.sm})` 
                : inputStyles.padding,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div
              style={{
                position: 'absolute',
                right: tokens.spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: tokens.zIndex.base,
                color: tokens.colors.neutral[500],
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <div
            style={{
              marginTop: tokens.spacing.xs,
              fontSize: tokens.typography.sizes.xs,
              color: error ? tokens.colors.error : tokens.colors.neutral[500],
            }}
          >
            {error || helperText}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'