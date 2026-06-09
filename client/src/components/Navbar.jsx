import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/roles.js';

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header
      className="h-14 flex items-center px-3 sm:px-5 flex-shrink-0 border-b border-white/10 gap-3"
      style={{ background: 'linear-gradient(135deg, #0050FF 0%, #00AACC 55%, #00CC44 100%)' }}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo + title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <img src="/nokia-logo.png" alt="Nokia" className="h-8 w-auto flex-shrink-0 rounded-md shadow-sm" />
        <div className="h-5 w-px bg-white/30 hidden sm:block" />
        <span className="text-white/90 text-sm font-medium hidden sm:block tracking-wide truncate">
          Scrap & Waste Management
        </span>
      </div>

      {/* User info + logout */}
      {user && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="text-right hidden md:block">
            <p className="text-white text-sm font-semibold leading-none truncate max-w-[140px]">{user.name}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {ROLE_LABELS[user.role]} · {user.emp_no}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm select-none flex-shrink-0">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/10 whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
