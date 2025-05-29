import React from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

interface User {
  id: number;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  ssoId?: string;
}

interface SidebarProps {
  user?: User;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="9" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="5" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="12" width="7" height="9" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="16" width="7" height="5" rx="2" stroke="currentColor" strokeWidth="2"/>
      </svg>
    },
    { path: '/payroll', label: 'Payroll', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    },
    { path: '/benefits', label: 'Benefits', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    },
    { path: '/salary-configuration', label: 'Configuration', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15C19.1277 15.6354 19.2583 16.3755 19.73 16.88L19.79 16.94C20.1812 17.3311 20.4001 17.8624 20.4001 18.415C20.4001 18.9676 20.1812 19.4989 19.79 19.89C19.3989 20.2812 18.8676 20.5001 18.315 20.5001C17.7624 20.5001 17.2311 20.2812 16.84 19.89L16.78 19.83C16.2755 19.3583 15.5354 19.2277 14.9 19.5C14.2837 19.7646 13.8734 20.352 13.86 21V21.2C13.86 22.3046 12.9646 23.2 11.86 23.2C10.7554 23.2 9.86 22.3046 9.86 21.2V21.11C9.83473 20.4404 9.39648 19.8546 8.76 19.6C8.12456 19.3277 7.38448 19.4583 6.88 19.93L6.82 19.99C6.42893 20.3812 5.8976 20.6001 5.345 20.6001C4.7924 20.6001 4.26107 20.3812 3.87 19.99C3.47882 19.5989 3.25994 19.0676 3.25994 18.515C3.25994 17.9624 3.47882 17.4311 3.87 17.04L3.93 16.98C4.40167 16.4755 4.53231 15.7354 4.26 15.1C3.99532 14.4837 3.40789 14.0734 2.76 14.06H2.56C1.45543 14.06 0.559998 13.1646 0.559998 12.06C0.559998 10.9554 1.45543 10.06 2.56 10.06H2.65C3.31957 10.0347 3.90533 9.59648 4.16 8.96C4.43231 8.32456 4.30167 7.58448 3.83 7.08L3.77 7.02C3.37882 6.62893 3.15994 6.0976 3.15994 5.545C3.15994 4.9924 3.37882 4.46107 3.77 4.07C4.16107 3.67882 4.6924 3.45994 5.245 3.45994C5.7976 3.45994 6.32893 3.67882 6.72 4.07L6.78 4.13C7.28448 4.60167 8.02456 4.73231 8.66 4.46C9.27634 4.19532 9.68665 3.60789 9.7 2.96V2.76C9.7 1.65543 10.5954 0.759998 11.7 0.759998C12.8046 0.759998 13.7 1.65543 13.7 2.76V2.85C13.7134 3.49789 14.1237 4.08532 14.74 4.35C15.3754 4.62231 16.1155 4.49167 16.62 4.02L16.68 3.96C17.0711 3.56882 17.6024 3.34994 18.155 3.34994C18.7076 3.34994 19.2389 3.56882 19.63 3.96C20.0212 4.35107 20.2401 4.8824 20.2401 5.435C20.2401 5.9876 20.0212 6.51893 19.63 6.91L19.57 6.97C19.0983 7.47448 18.9677 8.21456 19.24 8.85C19.5047 9.46634 20.0921 9.87665 20.74 9.89H20.94C22.0446 9.89 22.94 10.7854 22.94 11.89C22.94 12.9946 22.0446 13.89 20.94 13.89H20.85C20.1921 13.9034 19.6047 14.3137 19.4 14.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    },
  ];

  const adminNavItems = [
    { path: '/employees', label: 'Employees', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4C16 6.20914 14.2091 8 12 8C9.79086 8 8 6.20914 8 4C8 1.79086 9.79086 0 12 0C14.2091 0 16 1.79086 16 4Z" fill="currentColor"/>
        <path d="M16 14H8C4.68629 14 2 16.6863 2 20V22H22V20C22 16.6863 19.3137 14 16 14Z" fill="currentColor"/>
      </svg>
    },
    { path: '/settings', label: 'Settings', icon: 
      <svg className="mr-3 text-lg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15C19.1277 15.6354 19.2583 16.3755 19.73 16.88L19.79 16.94C20.1812 17.3311 20.4001 17.8624 20.4001 18.415C20.4001 18.9676 20.1812 19.4989 19.79 19.89C19.3989 20.2812 18.8676 20.5001 18.315 20.5001C17.7624 20.5001 17.2311 20.2812 16.84 19.89L16.78 19.83C16.2755 19.3583 15.5354 19.2277 14.9 19.5C14.2837 19.7646 13.8734 20.352 13.86 21V21.2C13.86 22.3046 12.9646 23.2 11.86 23.2C10.7554 23.2 9.86 22.3046 9.86 21.2V21.11C9.83473 20.4404 9.39648 19.8546 8.76 19.6C8.12456 19.3277 7.38448 19.4583 6.88 19.93L6.82 19.99C6.42893 20.3812 5.8976 20.6001 5.345 20.6001C4.7924 20.6001 4.26107 20.3812 3.87 19.99C3.47882 19.5989 3.25994 19.0676 3.25994 18.515C3.25994 17.9624 3.47882 17.4311 3.87 17.04L3.93 16.98C4.40167 16.4755 4.53231 15.7354 4.26 15.1C3.99532 14.4837 3.40789 14.0734 2.76 14.06H2.56C1.45543 14.06 0.559998 13.1646 0.559998 12.06C0.559998 10.9554 1.45543 10.06 2.56 10.06H2.65C3.31957 10.0347 3.90533 9.59648 4.16 8.96C4.43231 8.32456 4.30167 7.58448 3.83 7.08L3.77 7.02C3.37882 6.62893 3.15994 6.0976 3.15994 5.545C3.15994 4.9924 3.37882 4.46107 3.77 4.07C4.16107 3.67882 4.6924 3.45994 5.245 3.45994C5.7976 3.45994 6.32893 3.67882 6.72 4.07L6.78 4.13C7.28448 4.60167 8.02456 4.73231 8.66 4.46C9.27634 4.19532 9.68665 3.60789 9.7 2.96V2.76C9.7 1.65543 10.5954 0.759998 11.7 0.759998C12.8046 0.759998 13.7 1.65543 13.7 2.76V2.85C13.7134 3.49789 14.1237 4.08532 14.74 4.35C15.3754 4.62231 16.1155 4.49167 16.62 4.02L16.68 3.96C17.0711 3.56882 17.6024 3.34994 18.155 3.34994C18.7076 3.34994 19.2389 3.56882 19.63 3.96C20.0212 4.35107 20.2401 4.8824 20.2401 5.435C20.2401 5.9876 20.0212 6.51893 19.63 6.91L19.57 6.97C19.0983 7.47448 18.9677 8.21456 19.24 8.85C19.5047 9.46634 20.0921 9.87665 20.74 9.89H20.94C22.0446 9.89 22.94 10.7854 22.94 11.89C22.94 12.9946 22.0446 13.89 20.94 13.89H20.85C20.1921 13.9034 19.6047 14.3137 19.4 14.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200">
      <div className="p-4 border-b border-neutral-200">
        <h1 className="text-xl font-bold text-primary-600">PayrollPro</h1>
        <p className="text-xs text-neutral-500">Compensation & Benefits</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Main
        </div>

        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
          >
            <a className={`flex items-center px-6 py-2.5 text-sm font-medium ${
              isActive(item.path) 
                ? 'menu-active text-primary-600 border-l-3 border-primary-600 bg-primary-50/30' 
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}>
              {item.icon}
              {item.label}
            </a>
          </Link>
        ))}

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Administration
        </div>

        {adminNavItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
          >
            <a className={`flex items-center px-6 py-2.5 text-sm font-medium ${
              isActive(item.path) 
                ? 'menu-active text-primary-600 border-l-3 border-primary-600 bg-primary-50/30' 
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}>
              {item.icon}
              {item.label}
            </a>
          </Link>
        ))}
      </nav>

        {/* 用户信息和退出按钮 */}
        <div className="mt-auto p-4 border-t border-neutral-200">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.username} />
                  <AvatarFallback className="text-xs">
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username.slice(0, 2).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username
                    }
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.role === 'admin' ? '管理员' : 
                     user.role === 'manager' ? '经理' : '员工'}
                    {user.ssoId && ' (SSO)'}
                  </p>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLogout}
                className="w-full text-sm"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </Button>
            </div>
          )}
        </div>
    </aside>
  );
}

export default Sidebar;