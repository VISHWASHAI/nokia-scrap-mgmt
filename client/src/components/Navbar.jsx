import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/roles.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="h-14 flex items-center px-5 flex-shrink-0 border-b border-white/10"
      style={{ background: 'linear-gradient(135deg, #0050FF 0%, #00AACC 55%, #00CC44 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Nokia logo — inline SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 56" className="h-8 w-auto flex-shrink-0" aria-label="Nokia">
          {/* N */}
          <path d="M4 44 L4 12 L13 12 L27 34 L27 12 L36 12 L36 44 L27 44 L13 22 L13 44 Z" fill="white"/>
          {/* O */}
          <path d="M52 12 C38 12 38 44 52 44 L64 44 C78 44 78 12 64 12 Z
                   M52 20 L64 20 C70 20 70 36 64 36 L52 36 C46 36 46 20 52 20 Z" fill="white"/>
          {/* K */}
          <path d="M84 12 L93 12 L93 25 L106 12 L117 12 L102 28 L117 44 L106 44 L93 31 L93 44 L84 44 Z" fill="white"/>
          {/* I */}
          <path d="M122 12 L131 12 L131 44 L122 44 Z" fill="white"/>
          {/* A */}
          <path d="M137 44 L150 12 L159 12 L172 44 L163 44 L154 22 L145 44 Z
                   M147 32 L161 32 L159 38 L149 38 Z" fill="white"/>
        </svg>
        <div className="h-5 w-px bg-white/30 hidden sm:block" />
        <span className="text-white/90 text-sm font-medium hidden sm:block tracking-wide">
          Scrap & Waste Management
        </span>
      </div>

      {/* User info + logout */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {ROLE_LABELS[user.role]} · {user.emp_no}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm select-none">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
