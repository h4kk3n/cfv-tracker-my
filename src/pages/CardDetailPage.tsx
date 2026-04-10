import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Heart, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Card } from '../types/card';
import { getCardById } from '../services/cardService';
import { setCollectionItem, getCollectionItem } from '../services/collectionService';
import { addToWishlist } from '../services/wishlistService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';

export default function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('NM');

  useEffect(() => {
    if (cardId) {
      getCardById(cardId).then((c) => { setCard(c); setLoading(false); });
    }
  }, [cardId]);

  const handleAddToCollection = async () => {
    if (!user || !card) return;
    try {
      const existing = await getCollectionItem(user.uid, card.id);
      await setCollectionItem(user.uid, {
        cardId: card.id,
        quantity: (existing?.quantity || 0) + quantity,
        forTrade: existing?.forTrade || 0,
        condition: condition as any,
        notes: '',
        updatedAt: new Date().toISOString(),
      });
      addToast('success', `Added ${quantity}x ${card.nameEN} to collection`);
      setShowAddModal(false);
    } catch {
      addToast('error', 'Failed to add to collection');
    }
  };

  const handleAddToWishlist = async () => {
    if (!user || !card) return;
    try {
      await addToWishlist(user.uid, { cardId: card.id, priority: 'medium', maxQuantity: 1, addedAt: new Date().toISOString() });
      addToast('success', `Added ${card.nameEN} to wishlist`);
    } catch {
      addToast('error', 'Failed to add to wishlist');
    }
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!card) return <div className="py-20 text-center"><h2 className="text-xl">Card not found</h2></div>;

  return (
    <div className="space-y-6">
      <Link to="/cards" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeft size={16} /> Back to Card Database
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card Image */}
        <div className="md:col-span-1">
          <div className="card-container overflow-hidden aspect-[63/88] bg-gray-100 dark:bg-gray-700">
            {card.imageURL ? (
              <img src={card.imageURL} alt={card.nameEN} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
            )}
          </div>
          {user && (
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" onClick={() => setShowAddModal(true)}><Plus size={16} className="mr-1" /> Collection</Button>
              <Button variant="secondary" className="flex-1" onClick={handleAddToWishlist}><Heart size={16} className="mr-1" /> Wishlist</Button>
            </div>
          )}
        </div>

        {/* Card Details */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{card.nameEN}</h1>
              {card.errata && card.errata.length > 0 && <Badge variant="danger">Errata</Badge>}
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mt-1">{card.nameJP}</p>
            {card.nameRomaji && <p className="text-sm text-gray-500 italic">{card.nameRomaji}</p>}
            {card.cardType && <p className="text-sm text-gray-500 mt-1">{card.cardType}</p>}
            <p className="text-sm text-gray-400 mt-1">{card.cardNumber}{card.setName ? ` — ${card.setName}` : ''}</p>
          </div>

          {/* Stats */}
          <div className="card-container p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><span className="text-xs text-gray-500 block">Grade</span><span className="font-semibold">{card.grade}</span></div>
            <div><span className="text-xs text-gray-500 block">Power</span><span className="font-semibold">{card.power}</span></div>
            <div><span className="text-xs text-gray-500 block">Shield</span><span className="font-semibold">{card.shield ?? '-'}</span></div>
            <div><span className="text-xs text-gray-500 block">Critical</span><span className="font-semibold">{card.critical}</span></div>
            <div><span className="text-xs text-gray-500 block">Nation</span><span className="font-semibold">{card.nation}</span></div>
            <div><span className="text-xs text-gray-500 block">Race</span><span className="font-semibold">{card.race || '-'}</span></div>
            <div><span className="text-xs text-gray-500 block">Rarity</span><Badge>{card.rarity}</Badge></div>
            {card.trigger && <div><span className="text-xs text-gray-500 block">Trigger</span><Badge variant="warning">{card.trigger}</Badge></div>}
            {card.illustrator && <div><span className="text-xs text-gray-500 block">Illustrator</span><span className="font-semibold text-sm">{card.illustrator}</span></div>}
          </div>

          {/* Effect - English */}
          <div className="card-container p-4">
            <h3 className="font-semibold mb-2">Effect (English)</h3>
            <p className="text-sm whitespace-pre-wrap">{card.effectEN || 'No effect text available.'}</p>
          </div>

          {/* Effect - Japanese */}
          <div className="card-container p-4">
            <h3 className="font-semibold mb-2">Effect (Japanese)</h3>
            <p className="text-sm whitespace-pre-wrap" lang="ja">{card.effectJP || 'No Japanese text available.'}</p>
          </div>

          {/* Flavor Text */}
          {(card.flavorTextEN || card.flavorTextJP) && (
            <div className="card-container p-4">
              <h3 className="font-semibold mb-2">Flavor Text</h3>
              {card.flavorTextEN && <p className="text-sm italic text-gray-600 dark:text-gray-400">{card.flavorTextEN}</p>}
              {card.flavorTextJP && <p className="text-sm italic text-gray-600 dark:text-gray-400 mt-1" lang="ja">{card.flavorTextJP}</p>}
            </div>
          )}

          {/* Errata History */}
          {card.errata && card.errata.length > 0 && (
            <div className="card-container p-4 border-l-4 border-l-orange-400">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" /> Errata History
              </h3>
              <div className="space-y-4">
                {card.errata.map((e, i) => (
                  <div key={i} className="text-sm border-t border-gray-200 dark:border-gray-700 pt-3 first:border-t-0 first:pt-0">
                    <p className="font-medium text-orange-600 dark:text-orange-400">{formatDate(e.date)}</p>
                    <p className="mt-1"><span className="text-gray-500">Previous (EN):</span> {e.previousEffectEN}</p>
                    <p className="mt-1"><span className="text-gray-500">Previous (JP):</span> <span lang="ja">{e.previousEffectJP}</span></p>
                    {e.notes && <p className="mt-1 text-gray-500">Note: {e.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Collection Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add to Collection">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{card.nameEN} ({card.cardNumber})</p>
          <Input label="Quantity" type="number" min={1} max={99} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <Select label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)} options={[
            { value: 'Mint', label: 'Mint (M)' },
            { value: 'NM', label: 'Near Mint (NM)' },
            { value: 'LP', label: 'Lightly Played (LP)' },
            { value: 'MP', label: 'Moderately Played (MP)' },
            { value: 'HP', label: 'Heavily Played (HP)' },
          ]} />
          <Button className="w-full" onClick={handleAddToCollection}>Add to Collection</Button>
        </div>
      </Modal>
    </div>
  );
}
