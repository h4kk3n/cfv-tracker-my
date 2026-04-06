import { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, AlertTriangle, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { UserProfile, UserRole } from '../types/user';
import { Card } from '../types/card';
import { Trade } from '../types/trade';
import { getAllUsers, updateUserRole } from '../services/userService';
import { addCard, importCards } from '../services/cardService';
import { getReportedTrades, updateTradeStatus } from '../services/tradeService';
import { useNotification } from '../contexts/NotificationContext';
import { NATIONS, GRADES, TRIGGERS, RARITIES } from '../types/card';
import { TRADE_STATUS_COLORS, TRADE_STATUS_LABELS } from '../utils/constants';

export default function AdminDashboardPage() {
  const { addToast } = useNotification();
  const [tab, setTab] = useState<'cards' | 'users' | 'reports'>('cards');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [cardForm, setCardForm] = useState({
    cardNumber: '', nameEN: '', nameJP: '', nameRomaji: '', nation: '', clan: '', race: '',
    grade: 0, power: 0, shield: 0, critical: 1, trigger: '', skillIcon: '',
    format: ['Standard'], setId: '', setName: '', rarity: 'C',
    effectEN: '', effectJP: '', flavorTextEN: '', flavorTextJP: '', imageURL: '',
    errata: [] as any[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [usersData, reportsData] = await Promise.all([getAllUsers(), getReportedTrades()]);
    setUsers(usersData);
    setReports(reportsData);
    setLoading(false);
  };

  const handleAddCard = async () => {
    try {
      await addCard({ ...cardForm, shield: cardForm.shield || null } as any);
      addToast('success', 'Card added successfully');
      setShowAddCard(false);
      setCardForm({ cardNumber: '', nameEN: '', nameJP: '', nameRomaji: '', nation: '', clan: '', race: '', grade: 0, power: 0, shield: 0, critical: 1, trigger: '', skillIcon: '', format: ['Standard'], setId: '', setName: '', rarity: 'C', effectEN: '', effectJP: '', flavorTextEN: '', flavorTextJP: '', imageURL: '', errata: [] });
    } catch {
      addToast('error', 'Failed to add card');
    }
  };

  const handleImport = async () => {
    try {
      const cards = JSON.parse(importJson);
      const count = await importCards(cards);
      addToast('success', `Imported ${count} cards`);
      setShowImport(false);
      setImportJson('');
    } catch {
      addToast('error', 'Invalid JSON or import failed');
    }
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    try {
      await updateUserRole(uid, role);
      setUsers(users.map((u) => u.uid === uid ? { ...u, role } : u));
      addToast('success', 'Role updated');
    } catch {
      addToast('error', 'Failed to update role');
    }
  };

  const handleResolveDispute = async (tradeId: string, status: 'cancelled' | 'completed') => {
    await updateTradeStatus(tradeId, status);
    setReports(reports.filter((r) => r.id !== tradeId));
    addToast('success', `Trade ${status}`);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-primary-600" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['cards', 'users', 'reports'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {t} {t === 'reports' && reports.length > 0 && `(${reports.length})`}
          </button>
        ))}
      </div>

      {tab === 'cards' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setShowAddCard(true)}><CreditCard size={16} className="mr-1" /> Add Card</Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}><Upload size={16} className="mr-1" /> Import JSON</Button>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.uid} className="card-container p-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{u.displayName}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <Select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'moderator', label: 'Moderator' },
                  { value: 'admin', label: 'Admin' },
                ]}
                className="w-32"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        reports.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No reported trades</p>
        ) : (
          <div className="space-y-3">
            {reports.map((trade) => (
              <div key={trade.id} className="card-container p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Trade #{trade.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">Reported by: {trade.reportedBy}</p>
                    <p className="text-xs text-red-500 mt-1">{trade.reportReason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResolveDispute(trade.id, 'completed')}>Resolve</Button>
                    <Button variant="danger" size="sm" onClick={() => handleResolveDispute(trade.id, 'cancelled')}>Cancel</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Card Modal */}
      <Modal isOpen={showAddCard} onClose={() => setShowAddCard(false)} title="Add New Card" size="xl">
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <Input label="Card Number" value={cardForm.cardNumber} onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })} placeholder="D-BT01/001" />
          <Input label="Name (EN)" value={cardForm.nameEN} onChange={(e) => setCardForm({ ...cardForm, nameEN: e.target.value })} />
          <Input label="Name (JP)" value={cardForm.nameJP} onChange={(e) => setCardForm({ ...cardForm, nameJP: e.target.value })} />
          <Input label="Name (Romaji)" value={cardForm.nameRomaji} onChange={(e) => setCardForm({ ...cardForm, nameRomaji: e.target.value })} />
          <Select label="Nation" value={cardForm.nation} onChange={(e) => setCardForm({ ...cardForm, nation: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...NATIONS.map((n) => ({ value: n, label: n }))]} />
          <Input label="Race" value={cardForm.race} onChange={(e) => setCardForm({ ...cardForm, race: e.target.value })} />
          <Input label="Grade" type="number" value={cardForm.grade} onChange={(e) => setCardForm({ ...cardForm, grade: Number(e.target.value) })} />
          <Input label="Power" type="number" value={cardForm.power} onChange={(e) => setCardForm({ ...cardForm, power: Number(e.target.value) })} />
          <Input label="Shield" type="number" value={cardForm.shield} onChange={(e) => setCardForm({ ...cardForm, shield: Number(e.target.value) })} />
          <Select label="Rarity" value={cardForm.rarity} onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value })}
            options={RARITIES.map((r) => ({ value: r, label: r }))} />
          <Input label="Set ID" value={cardForm.setId} onChange={(e) => setCardForm({ ...cardForm, setId: e.target.value })} />
          <Input label="Set Name" value={cardForm.setName} onChange={(e) => setCardForm({ ...cardForm, setName: e.target.value })} />
          <Input label="Image URL" value={cardForm.imageURL} onChange={(e) => setCardForm({ ...cardForm, imageURL: e.target.value })} className="col-span-2" />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effect (EN)</label>
            <textarea className="input-field" rows={3} value={cardForm.effectEN} onChange={(e) => setCardForm({ ...cardForm, effectEN: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effect (JP)</label>
            <textarea className="input-field" rows={3} value={cardForm.effectJP} onChange={(e) => setCardForm({ ...cardForm, effectJP: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Button className="w-full" onClick={handleAddCard}>Add Card</Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import Cards (JSON)">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Paste a JSON array of card objects.</p>
          <textarea className="input-field font-mono text-xs" rows={10} value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder='[{"cardNumber":"D-BT01/001","nameEN":"...","nameJP":"..."}]' />
          <Button className="w-full" onClick={handleImport}>Import</Button>
        </div>
      </Modal>
    </div>
  );
}
