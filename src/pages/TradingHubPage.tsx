import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Users, Zap } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Trade, TradeMatch } from '../types/trade';
import { getUserTrades } from '../services/tradeService';
import { getCollection } from '../services/collectionService';
import { getWishlist } from '../services/wishlistService';
import { getUsersWithForTrade } from '../services/collectionService';
import { getUserProfile } from '../services/userService';
import { findTradeMatches } from '../utils/tradeMatching';
import { useAuth } from '../contexts/AuthContext';
import { TRADE_STATUS_COLORS, TRADE_STATUS_LABELS } from '../utils/constants';
import { formatRelativeTime } from '../utils/formatters';

export default function TradingHubPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trades' | 'matches'>('trades');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [userTrades, myCollection, myWishlist, usersForTrade] = await Promise.all([
        getUserTrades(user.uid),
        getCollection(user.uid),
        getWishlist(user.uid),
        getUsersWithForTrade(),
      ]);
      setTrades(userTrades);

      // Build trade matches
      const otherUsers = await Promise.all(
        usersForTrade
          .filter((u) => u.userId !== user.uid)
          .map(async (u) => {
            const profile = await getUserProfile(u.userId);
            const wishlist = await getWishlist(u.userId);
            return {
              userId: u.userId,
              displayName: profile?.displayName || 'Unknown',
              forTrade: u.items,
              wishlist,
            };
          })
      );
      const foundMatches = findTradeMatches(myCollection, myWishlist, otherUsers);
      setMatches(foundMatches);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Trading Hub</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('trades')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'trades' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          My Trades ({trades.length})
        </button>
        <button onClick={() => setTab('matches')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'matches' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Zap size={14} className="inline mr-1" />
          Matches ({matches.length})
        </button>
      </div>

      {tab === 'trades' ? (
        trades.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight size={48} />}
            title="No trades yet"
            description="Check the Matches tab to find potential trade partners, or browse other players' collections."
          />
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <Link key={trade.id} to={`/trades/${trade.id}`} className="card-container p-4 block hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {trade.initiatorId === user!.uid ? 'You' : 'They'} offered {trade.initiatorCards.length} card(s)
                      for {trade.receiverCards.length} card(s)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trade.createdAt ? formatRelativeTime(new Date(trade.createdAt).getTime()) : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${TRADE_STATUS_COLORS[trade.status]}`}>
                    {TRADE_STATUS_LABELS[trade.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        matches.length === 0 ? (
          <EmptyState
            icon={<Users size={48} />}
            title="No matches found"
            description="Add more cards to your collection and wishlist to find trade partners."
          />
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.userId} className="card-container p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Link to={`/profile/${match.userId}`} className="font-medium hover:text-primary-600">{match.displayName}</Link>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-green-600">{match.theyCanGiveMe.length} card(s) they can give you</span>
                      <span className="text-blue-600">{match.iCanGiveThem.length} card(s) you can give them</span>
                    </div>
                  </div>
                  <Badge variant="info">Score: {match.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
