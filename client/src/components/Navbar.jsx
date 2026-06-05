import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/roles.js';

export default function Navbar({ title = 'Nokia Scrap & Waste Management' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="bg-nokia-blue text-white h-14 flex items-center px-6 shadow-md z-50 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded font-black text-nokia-blue text-sm select-none">
          N
        </div>
        <span className="font-semibold text-sm tracking-wide">{title}</span>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-blue-200 mt-0.5">{ROLE_LABELS[user.role]} · {user.emp_no}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
