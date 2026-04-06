import { Link, useLocation } from 'react-router-dom';
import { X, Home, CreditCard, FolderOpen, Heart, ArrowLeftRight, MessageCircle, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { APP_NAME } from '../../utils/constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, userProfile } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Home', icon: Home, auth: false },
    { to: '/cards', label: 'Card Database', icon: CreditCard, auth: false },
    { to: '/collection', label: 'My Collection', icon: FolderOpen, auth: true },
    { to: '/wishlist', label: 'Wishlist', icon: Heart, auth: true },
    { to: '/trades', label: 'Trading Hub', icon: ArrowLeftRight, auth: true },
    { to: '/chat', label: 'Messages', icon: MessageCircle, auth: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <span className="font-bold text-lg">{APP_NAME}</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            if (item.auth && !user) return null;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
          {userProfile?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Shield size={20} />
              Admin Panel
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
