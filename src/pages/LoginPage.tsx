import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { loginUser, loginWithGoogle } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { validateEmail } from '../utils/validators';
import { APP_NAME } from '../utils/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useNotification();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) { setErrors({ email: emailError }); return; }
    if (!password) { setErrors({ password: 'Password is required' }); return; }
    setErrors({});
    setLoading(true);
    try {
      await loginUser(email, password);
      addToast('success', 'Logged in successfully!');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : 'Login failed. Please try again.';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      addToast('success', 'Logged in with Google!');
      navigate(from, { replace: true });
    } catch (err: any) {
      addToast('error', 'Google login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md card-container p-8">
        <div className="text-center mb-8">
          <Shield className="mx-auto text-primary-600 mb-3" size={40} />
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder="Enter your password" />
          <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          <span className="text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogleLogin}>
          Sign in with Google
        </Button>

        <div className="mt-6 text-center text-sm">
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
