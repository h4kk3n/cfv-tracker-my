import { Link } from 'react-router-dom';
import { CreditCard, ArrowLeftRight, MessageCircle, Search, Shield, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME, APP_DESCRIPTION } from '../utils/constants';

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    { icon: Search, title: 'Card Database', desc: 'Browse all Cardfight!! Vanguard Standard cards with Japanese and English text', link: '/cards' },
    { icon: CreditCard, title: 'Collection Tracker', desc: 'Track your card collection with quantities and conditions', link: '/collection' },
    { icon: ArrowLeftRight, title: 'Trading Hub', desc: 'Find trade partners with automatic matching based on your collection and wishlist', link: '/trades' },
    { icon: MessageCircle, title: 'In-App Chat', desc: 'Chat directly with traders to negotiate and arrange meetups', link: '/chat' },
    { icon: Shield, title: 'Card Reference', desc: 'View card effects in both Japanese and English with errata history', link: '/cards' },
    { icon: Users, title: 'Community', desc: 'Connect with Malaysian CFV players and build your reputation', link: '/trades' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {APP_NAME}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          {APP_DESCRIPTION}. Track your cards, find trades, and connect with the community.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/cards" className="btn-primary px-8 py-3 text-lg rounded-xl">Browse Cards</Link>
          {!user && (
            <Link to="/register" className="btn-secondary px-8 py-3 text-lg rounded-xl">Join Now</Link>
          )}
          {user && (
            <Link to="/collection" className="btn-secondary px-8 py-3 text-lg rounded-xl">My Collection</Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.link} className="card-container p-6 hover:shadow-md transition-shadow">
              <feature.icon className="text-primary-600 mb-3" size={32} />
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="card-container p-8 text-center bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950 dark:to-blue-950">
          <h2 className="text-2xl font-bold mb-3">Ready to start trading?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create a free account to track your collection and find trade partners.</p>
          <Link to="/register" className="btn-primary px-8 py-3 rounded-xl">Create Account</Link>
        </section>
      )}
    </div>
  );
}
