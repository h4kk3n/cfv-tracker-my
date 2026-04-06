import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { registerUser } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validators';
import { APP_NAME } from '../utils/constants';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameErr = validateDisplayName(displayName);
    if (nameErr) newErrors.displayName = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) newErrors.password = passErr;
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      await registerUser(email, password, displayName);
      addToast('success', 'Account created successfully!');
      navigate('/');
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email is already registered'
        : 'Registration failed. Please try again.';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md card-container p-8">
        <div className="text-center mb-8">
          <Shield className="mx-auto text-primary-600 mb-3" size={40} />
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={errors.displayName} placeholder="Your display name" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder="Min 8 chars, uppercase, lowercase, number" />
          <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} placeholder="Confirm your password" />
          <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
