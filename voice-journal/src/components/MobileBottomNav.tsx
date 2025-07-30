import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface BottomNavItem {
  id: string
  path: string
  label: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
}

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems: BottomNavItem[] = [
    {
      id: 'home',
      path: '/',
      label: '홈',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      activeIcon: (
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
        </svg>
      )
    },
    {
      id: 'voice',
      path: '/voice',
      label: '음성',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
      activeIcon: (
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
          <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
        </svg>
      )
    },
    {
      id: 'timeline',
      path: '/timeline',
      label: '타임라인',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5m-9-6h.008v.008H12V12.75z" />
        </svg>
      ),
      activeIcon: (
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'settings',
      path: '/settings',
      label: '설정',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      activeIcon: (
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.570.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
        </svg>
      )
    }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard'
    }
    return location.pathname === path
  }

  const handleNavigation = (path: string) => {
    if (path === '/voice') {
      // Voice recording should be handled on the main dashboard
      navigate('/')
      return
    }
    if (path === '/timeline') {
      // Timeline view can be implemented later
      // For now, redirect to main dashboard
      navigate('/')
      return
    }
    navigate(path)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-white border-opacity-20"
        style={{
          height: '80px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex flex-col items-center justify-center transition-all duration-300 touch-target
                  ${active 
                    ? 'text-blue-600 transform scale-105' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
                style={{
                  minWidth: '64px',
                  minHeight: '64px',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-xs)'
                }}
              >
                {/* Icon Container */}
                <div 
                  className={`
                    flex items-center justify-center transition-all duration-300
                    ${active 
                      ? 'glass-card-strong bg-blue-50 bg-opacity-80 transform scale-110' 
                      : 'hover:glass-card hover:bg-white hover:bg-opacity-30'
                    }
                  `}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-xs)'
                  }}
                >
                  <div 
                    className="icon-standard"
                    style={{
                      color: active ? 'var(--color-primary)' : 'inherit'
                    }}
                  >
                    {active ? item.activeIcon : item.icon}
                  </div>
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    text-xs font-medium transition-all duration-300
                    ${active ? 'text-blue-600' : 'text-gray-500'}
                  `}
                  style={{
                    fontSize: '11px',
                    lineHeight: '1.2',
                    fontWeight: active ? '600' : '500'
                  }}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Bottom padding to prevent content overlap */}
      <div style={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} />
    </>
  )
}