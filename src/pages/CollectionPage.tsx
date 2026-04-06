import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Minus, ArrowLeftRight, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { CollectionItem } from '../types/collection';
import { Card } from '../types/card';
import { getCollection, updateQuantity, removeFromCollection } from '../services/collectionService';
import { getCardById } from '../services/cardService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface CollectionCardData {
  item: CollectionItem;
  card: Card | null;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [items, setItems] = useState<CollectionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) loadCollection();
  }, [user]);

  const loadCollection = async () => {
    if (!user) return;
    setLoading(true);
    const collectionItems = await getCollection(user.uid);
    const withCards = await Promise.all(
      collectionItems.map(async (item) => {
        const card = await getCardById(item.cardId);
        return { item, card };
      })
    );
    setItems(withCards);
    setLoading(false);
  };

  const handleQuantityChange = async (cardId: string, delta: number) => {
    if (!user) return;
    const existing = items.find((i) => i.item.cardId === cardId);
    if (!existing) return;
    const newQty = Math.max(0, existing.item.quantity + delta);
    if (newQty === 0) {
      await removeFromCollection(user.uid, cardId);
      setItems(items.filter((i) => i.item.cardId !== cardId));
      addToast('info', 'Removed from collection');
    } else {
      await updateQuantity(user.uid, cardId, newQty, Math.min(existing.item.forTrade, newQty));
      setItems(items.map((i) =>
        i.item.cardId === cardId ? { ...i, item: { ...i.item, quantity: newQty, forTrade: Math.min(i.item.forTrade, newQty) } } : i
      ));
    }
  };

  const handleForTradeChange = async (cardId: string, delta: number) => {
    if (!user) return;
    const existing = items.find((i) => i.item.cardId === cardId);
    if (!existing) return;
    const newForTrade = Math.max(0, Math.min(existing.item.quantity, existing.item.forTrade + delta));
    await updateQuantity(user.uid, cardId, existing.item.quantity, newForTrade);
    setItems(items.map((i) =>
      i.item.cardId === cardId ? { ...i, item: { ...i.item, forTrade: newForTrade } } : i
    ));
  };

  const handleExport = () => {
    const data = items.map((i) => ({
      cardId: i.item.cardId,
      cardNumber: i.card?.cardNumber || '',
      nameEN: i.card?.nameEN || '',
      quantity: i.item.quantity,
      forTrade: i.item.forTrade,
      condition: i.item.condition,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cfv-collection.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.card?.nameEN.toLowerCase().includes(q) ||
      i.card?.nameJP.includes(q) ||
      i.card?.cardNumber.toLowerCase().includes(q)
    );
  });

  const totalCards = items.reduce((sum, i) => sum + i.item.quantity, 0);
  const totalForTrade = items.reduce((sum, i) => sum + i.item.forTrade, 0);

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Collection</h1>
          <p className="text-sm text-gray-500">{items.length} unique cards, {totalCards} total, {totalForTrade} for trade</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Link to="/cards">
            <Button size="sm"><Plus size={16} className="mr-1" /> Add Cards</Button>
          </Link>
        </div>
      </div>

      <Input placeholder="Search your collection..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No cards in your collection"
          description="Start by browsing the card database and adding cards."
          action={<Link to="/cards"><Button>Browse Cards</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(({ item, card }) => (
            <div key={item.cardId} className="card-container p-3 flex items-center gap-4">
              <Link to={`/cards/${item.cardId}`} className="w-10 h-14 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {card?.imageURL && <img src={card.imageURL} alt={card.nameEN} className="w-full h-full object-cover" loading="lazy" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/cards/${item.cardId}`} className="font-medium text-sm hover:text-primary-600 truncate block">{card?.nameEN || item.cardId}</Link>
                <p className="text-xs text-gray-500">{card?.cardNumber} - {card?.nameJP}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleQuantityChange(item.cardId, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={14} /></button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => handleQuantityChange(item.cardId, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={14} /></button>
              </div>
              <div className="flex items-center gap-1" title="For trade">
                <ArrowLeftRight size={14} className="text-gray-400" />
                <button onClick={() => handleForTradeChange(item.cardId, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={12} /></button>
                <span className="w-6 text-center text-xs">{item.forTrade}</span>
                <button onClick={() => handleForTradeChange(item.cardId, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={12} /></button>
              </div>
              <Badge>{item.condition}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
