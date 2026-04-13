import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { WishlistItem } from '../types/trade';
import { Card } from '../types/card';
import { getWishlist, removeFromWishlist, updateWishlistPriority } from '../services/wishlistService';
import { getCardById } from '../services/cardService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface WishlistCardData {
  item: WishlistItem;
  card: Card | null;
}

const PRIORITY_BADGE_VARIANTS = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
} as const;

export default function WishlistPage() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [items, setItems] = useState<WishlistCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    if (!user) return;
    setLoading(true);
    const wishlistItems = await getWishlist(user.uid);
    const withCards = await Promise.all(
      wishlistItems.map(async (item) => ({ item, card: await getCardById(item.cardId) }))
    );
    setItems(withCards);
    setLoading(false);
  };

  const handleRemove = async (cardId: string) => {
    if (!user) return;
    await removeFromWishlist(user.uid, cardId);
    setItems(items.filter((i) => i.item.cardId !== cardId));
    addToast('info', 'Removed from wishlist');
  };

  const handlePriorityChange = async (cardId: string, priority: string) => {
    if (!user) return;
    await updateWishlistPriority(user.uid, cardId, priority);
    setItems(items.map((i) =>
      i.item.cardId === cardId ? { ...i, item: { ...i.item, priority: priority as WishlistItem['priority'] } } : i
    ));
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-sm text-gray-500">{items.length} card{items.length !== 1 ? 's' : ''} wanted</p>
        </div>
        <Link to="/cards"><Button size="sm"><Plus size={16} className="mr-1" /> Browse Cards</Button></Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Heart size={48} />}
          title="Your wishlist is empty"
          description="Browse the card database and add cards you're looking for."
          action={<Link to="/cards"><Button>Browse Cards</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {items.map(({ item, card }) => (
            <div key={item.cardId} className="card-container p-3">
              {/* Row: thumbnail + text + controls */}
              <div className="flex items-center gap-3">
                {/* Thumbnail */}
                <Link
                  to={`/cards/${item.cardId}`}
                  className="w-10 h-14 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0"
                >
                  {card?.imageURL && (
                    <img
                      src={card.imageURL}
                      alt={card.nameEN}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </Link>

                {/* Card info — takes remaining space, truncates */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/cards/${item.cardId}`}
                    className="font-medium text-sm hover:text-primary-600 truncate block"
                  >
                    {card?.nameEN || item.cardId}
                  </Link>
                  <p className="text-xs text-gray-500 truncate">
                    {card?.cardNumber}{card?.nameJP ? ` — ${card.nameJP}` : ''}
                  </p>
                </div>

                {/* Priority badge — visible on sm+, hidden on mobile to save space */}
                <div className="hidden sm:block flex-shrink-0">
                  <Badge variant={PRIORITY_BADGE_VARIANTS[item.priority]}>
                    {item.priority}
                  </Badge>
                </div>

                {/* Priority select */}
                <div className="flex-shrink-0 w-[100px]">
                  <Select
                    value={item.priority}
                    onChange={(e) => handlePriorityChange(item.cardId, e.target.value)}
                    options={[
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                    aria-label={`Priority for ${card?.nameEN || item.cardId}`}
                  />
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleRemove(item.cardId)}
                  className="flex-shrink-0 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                  aria-label={`Remove ${card?.nameEN || item.cardId} from wishlist`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
