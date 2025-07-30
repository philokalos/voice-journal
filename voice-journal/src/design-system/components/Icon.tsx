import React from 'react'
import { tokens } from '../tokens'

export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'outline' | 'solid'
  spin?: boolean
}

export const Icon: React.FC<IconProps> = ({
  size = 'md',
  variant = 'outline',
  spin = false,
  className = '',
  style,
  children,
  ...props
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          width: '16px',
          height: '16px',
        }
      case 'md':
        return {
          width: tokens.components.icon.standard,
          height: tokens.components.icon.standard,
        }
      case 'lg':
        return {
          width: tokens.components.icon.large,
          height: tokens.components.icon.large,
        }
      case 'xl':
        return {
          width: '32px',
          height: '32px',
        }
      default:
        return {}
    }
  }

  const baseStyles: React.CSSProperties = {
    flexShrink: 0,
    strokeWidth: variant === 'outline' ? 1.5 : 0,
    fill: variant === 'solid' ? 'currentColor' : 'none',
    stroke: variant === 'outline' ? 'currentColor' : 'none',
    transition: 'all 0.2s ease',
    ...getSizeStyles(),
    ...style,
  }

  return (
    <svg
      className={`icon-component ${spin ? 'animate-spin' : ''} ${className}`}
      style={baseStyles}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  )
}

// Common icon components
export const SpinnerIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props} spin>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </Icon>
)

export const CheckIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </Icon>
)

export const XIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </Icon>
)

export const MicrophoneIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </Icon>
)

export const PlayIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </Icon>
)

export const StopIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Icon>
)

export const HomeIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </Icon>
)

export const SettingsIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Icon>
)

export const CalendarIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5m-9-6h.008v.008H12V12.75z" />
  </Icon>
)

export const TrashIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </Icon>
)

export const EditIcon: React.FC<Omit<IconProps, 'children'>> = (props) => (
  <Icon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </Icon>
)