import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CardBrowserPage from './pages/CardBrowserPage';
import CardDetailPage from './pages/CardDetailPage';
import CollectionPage from './pages/CollectionPage';
import WishlistPage from './pages/WishlistPage';
import TradingHubPage from './pages/TradingHubPage';
import TradeDetailPage from './pages/TradeDetailPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <HashRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="cards" element={<CardBrowserPage />} />
                <Route path="cards/:cardId" element={<CardDetailPage />} />
                <Route path="collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
                <Route path="wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                <Route path="trades" element={<ProtectedRoute><TradingHubPage /></ProtectedRoute>} />
                <Route path="trades/:tradeId" element={<ProtectedRoute><TradeDetailPage /></ProtectedRoute>} />
                <Route path="chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
