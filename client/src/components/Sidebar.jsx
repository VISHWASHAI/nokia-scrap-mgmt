import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { hasMinRole } from '../constants/roles.js';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/declaration/new', label: 'New Declaration', icon: '📝' },
  { to: '/submissions', label: 'My Submissions', icon: '📋' },
  { to: '/vendor-log', label: 'Vendor Log', icon: '🚛' },
  { to: '/live-excel', label: 'Live Excel', icon: '📡', minRole: 'FACILITY_MANAGER' },
  { to: '/admin', label: 'Admin', icon: '⚙️', minRole: 'ADMIN' },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <nav className="flex-1 py-4">
        {navItems.map(item => {
          if (item.minRole && !hasMinRole(user?.role, item.minRole)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-nokia-light text-nokia-blue border-r-2 border-nokia-blue'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Nokia Scrap Mgmt v1.0</p>
      </div>
    </aside>
  );
}
