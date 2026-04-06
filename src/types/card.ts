export interface CardErrata {
  date: string;
  previousEffectEN: string;
  previousEffectJP: string;
  notes: string;
}

export interface Card {
  id: string;
  cardNumber: string;
  nameEN: string;
  nameJP: string;
  nameRomaji: string;
  nation: string;
  clan: string;
  race: string;
  grade: number;
  power: number;
  shield: number | null;
  critical: number;
  trigger: string | null;
  skillIcon: string | null;
  format: string[];
  setId: string;
  setName: string;
  rarity: string;
  effectEN: string;
  effectJP: string;
  flavorTextEN: string;
  flavorTextJP: string;
  imageURL: string;
  errata: CardErrata[];
  searchTokens: string[];
  updatedAt: string;
}

export interface CardFilters {
  search: string;
  nation: string;
  grade: number | null;
  trigger: string;
  rarity: string;
  setId: string;
  format: string;
}

export const NATIONS = [
  'Dragon Empire', 'Dark States', 'Brandt Gate', 'Keter Sanctuary', 'Stoicheia', 'Lyrical Monasterio'
];

export const GRADES = [0, 1, 2, 3, 4, 5];

export const TRIGGERS = ['Critical', 'Draw', 'Front', 'Heal', 'Over'];

export const RARITIES = ['C', 'R', 'RR', 'RRR', 'VR', 'SP', 'SSR', 'ORR', 'SCR'];
