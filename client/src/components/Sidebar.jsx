import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { hasMinRole } from '../constants/roles.js';

const navItems = [
  {
    to: '/dashboard', label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/declaration/new', label: 'New Declaration',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/submissions', label: 'My Submissions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/vendor-log', label: 'Vendor Log',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    to: '/live-excel', label: 'Live Excel',
    minRole: 'FACILITY_MANAGER',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/admin', label: 'Admin',
    minRole: 'ADMIN',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside
      className="w-56 flex flex-col flex-shrink-0 border-r border-white/10"
      style={{ background: 'rgba(0,10,30,0.55)', backdropFilter: 'blur(16px)' }}
    >
      {/* Nav group label */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-xs font-semibold text-white/65 uppercase tracking-widest">Menu</p>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(item => {
          if (item.minRole && !hasMinRole(user?.role, item.minRole)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#00AACC]' : 'text-white/65'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00CC44]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom brand strip */}
      <div className="p-4 border-t border-white/10">
        <div
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
          style={{ background: 'linear-gradient(135deg, rgba(0,80,255,0.18) 0%, rgba(0,204,68,0.12) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Mini Nokia wordmark */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 32" className="h-4 w-auto" aria-label="Nokia">
            <path d="M2 26 L2 6 L7 6 L15 18 L15 6 L20 6 L20 26 L15 26 L7 14 L7 26 Z" fill="white" opacity="0.9"/>
            <path d="M28 6 C21 6 21 26 28 26 L35 26 C42 26 42 6 35 6 Z M28 11 L35 11 C38 11 38 21 35 21 L28 21 C25 21 25 11 28 11 Z" fill="white" opacity="0.9"/>
            <path d="M48 6 L53 6 L53 14 L61 6 L67 6 L58 16 L67 26 L61 26 L53 18 L53 26 L48 26 Z" fill="white" opacity="0.9"/>
            <path d="M71 6 L76 6 L76 26 L71 26 Z" fill="white" opacity="0.9"/>
            <path d="M80 26 L88 6 L93 6 L101 26 L96 26 L90 10 L84 26 Z M85 18 L95 18 L94 22 L86 22 Z" fill="white" opacity="0.9"/>
          </svg>
          <p className="text-xs text-white/70 leading-none">Scrap & Waste Management</p>
        </div>
      </div>
    </aside>
  );
}
