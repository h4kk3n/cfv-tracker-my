import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Grid, List } from 'lucide-react';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { Card, CardFilters, NATIONS, GRADES, TRIGGERS, RARITIES } from '../types/card';
import { getAllCards } from '../services/cardService';
import { filterCards, sortCards } from '../utils/cardFilters';
import { CARDS_PER_PAGE } from '../utils/constants';

export default function CardBrowserPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filtered, setFiltered] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CardFilters>({
    search: '', nation: '', grade: null, trigger: '', rarity: '', setId: '', format: 'Standard', cardType: '',
  });

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    let result = filterCards(cards, filters);
    result = sortCards(result, sortBy);
    setFiltered(result);
    setPage(1);
  }, [cards, filters, sortBy]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await getAllCards();
      setCards(data);
    } catch {
      setCards([]);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE);
  const pageCards = filtered.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE);

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Card Database</h1>
        <span className="text-sm text-gray-500">{filtered.length} cards</span>
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input-field pl-10"
            placeholder="Search by name (EN/JP), card number..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-100 dark:bg-primary-900' : ''}`}>
            <Filter size={16} /> Filters
          </button>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[
            { value: 'name', label: 'Name' },
            { value: 'grade', label: 'Grade' },
            { value: 'power', label: 'Power' },
            { value: 'newest', label: 'Newest' },
          ]} />
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-primary-100 dark:bg-primary-900' : ''}`}><Grid size={16} /></button>
            <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-primary-100 dark:bg-primary-900' : ''}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card-container p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select label="Nation" value={filters.nation} onChange={(e) => setFilters({ ...filters, nation: e.target.value })}
            options={[{ value: '', label: 'All Nations' }, ...NATIONS.map((n) => ({ value: n, label: n }))]} />
          <Select label="Grade" value={filters.grade?.toString() || ''} onChange={(e) => setFilters({ ...filters, grade: e.target.value ? Number(e.target.value) : null })}
            options={[{ value: '', label: 'All Grades' }, ...GRADES.map((g) => ({ value: g.toString(), label: `Grade ${g}` }))]} />
          <Select label="Trigger" value={filters.trigger} onChange={(e) => setFilters({ ...filters, trigger: e.target.value })}
            options={[{ value: '', label: 'All Triggers' }, ...TRIGGERS.map((t) => ({ value: t, label: t }))]} />
          <Select label="Rarity" value={filters.rarity} onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
            options={[{ value: '', label: 'All Rarities' }, ...RARITIES.map((r) => ({ value: r, label: r }))]} />
        </div>
      )}

      {/* Card Grid/List */}
      {pageCards.length === 0 ? (
        <EmptyState title="No cards found" description="Try adjusting your search or filters." icon={<Search size={48} />} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {pageCards.map((card) => (
            <Link key={card.id} to={`/cards/${card.id}`} className="card-container overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-[63/88] bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {card.imageURL ? (
                  <img src={card.imageURL} alt={card.nameEN} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="text-center p-2">
                    <p className="text-xs text-gray-500 font-medium">{card.cardNumber}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.nameJP || card.nameEN}</p>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{card.nameEN}</p>
                <p className="text-xs text-gray-500 truncate">{card.nameJP}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="info">{`G${card.grade}`}</Badge>
                  {card.trigger && <Badge variant="warning">{card.trigger}</Badge>}
                  {card.errata && card.errata.length > 0 && <Badge variant="danger">Errata</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {pageCards.map((card) => (
            <Link key={card.id} to={`/cards/${card.id}`} className="card-container p-3 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {card.imageURL && <img src={card.imageURL} alt={card.nameEN} className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{card.nameEN}</p>
                <p className="text-sm text-gray-500 truncate">{card.nameJP} {card.nameRomaji && `(${card.nameRomaji})`}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge>{card.nation}</Badge>
                <Badge variant="info">{`G${card.grade}`}</Badge>
                <Badge>{card.rarity}</Badge>
              </div>
              <span className="text-xs text-gray-400">{card.cardNumber}</span>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
