import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center">
      <div>
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
        <h2 className="text-xl font-semibold mt-4">Page Not Found</h2>
        <p className="text-gray-500 mt-2 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/"><Button>Go Home</Button></Link>
      </div>
    </div>
  );
}
