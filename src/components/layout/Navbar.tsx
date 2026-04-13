import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { APP_NAME } from '../../utils/constants';

interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, userProfile } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    await signOut(auth);
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={onMenuToggle} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Shield className="text-primary-600" size={28} />
              <span className="font-bold text-lg hidden sm:block">{APP_NAME}</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <Link to="/cards" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Cards</Link>
            {user && (
              <>
                <Link to="/collection" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Collection</Link>
                <Link to="/wishlist" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Wishlist</Link>
                <Link to="/trades" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Trades</Link>
                <Link to="/chat" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Chat</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Toggle theme">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <User size={16} className="text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{userProfile?.displayName || 'User'}</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <Link to={`/profile/${user.uid}`} onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <User size={16} /> Profile
                    </Link>
                    {userProfile?.role === 'admin' && (
                      <Link to="/admin" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Shield size={16} /> Admin
                      </Link>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-primary text-sm px-4 py-2 rounded-lg">Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
