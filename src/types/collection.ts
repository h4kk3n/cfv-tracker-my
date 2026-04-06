export type CardCondition = 'Mint' | 'NM' | 'LP' | 'MP' | 'HP';

export interface CollectionItem {
  cardId: string;
  quantity: number;
  forTrade: number;
  condition: CardCondition;
  notes: string;
  updatedAt: string;
}
