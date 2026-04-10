import { Card, CardFilters } from '../types/card';

export function filterCards(cards: Card[], filters: CardFilters): Card[] {
  return cards.filter((card) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        card.nameEN.toLowerCase().includes(q) ||
        card.nameJP.includes(q) ||
        card.nameRomaji.toLowerCase().includes(q) ||
        card.cardNumber.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (filters.nation && card.nation !== filters.nation) return false;
    if (filters.grade !== null && card.grade !== filters.grade) return false;
    if (filters.trigger && card.trigger !== filters.trigger) return false;
    if (filters.rarity && card.rarity !== filters.rarity) return false;
    if (filters.setId && card.setId !== filters.setId) return false;
    if (filters.format && !card.format.includes(filters.format)) return false;
    if (filters.cardType && card.cardType !== filters.cardType) return false;
    return true;
  });
}

export function sortCards(cards: Card[], sortBy: string): Card[] {
  const sorted = [...cards];
  switch (sortBy) {
    case 'name': return sorted.sort((a, b) => a.nameEN.localeCompare(b.nameEN));
    case 'grade': return sorted.sort((a, b) => a.grade - b.grade);
    case 'power': return sorted.sort((a, b) => a.power - b.power);
    case 'newest': return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    default: return sorted;
  }
}
