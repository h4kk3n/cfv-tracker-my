export type TradeStatus = 'pending' | 'discussing' | 'accepted' | 'completed' | 'declined' | 'cancelled' | 'disputed';
export type WishlistPriority = 'high' | 'medium' | 'low';

export interface TradeCard {
  cardId: string;
  quantity: number;
  condition: string;
}

export interface Trade {
  id: string;
  initiatorId: string;
  receiverId: string;
  status: TradeStatus;
  initiatorCards: TradeCard[];
  receiverCards: TradeCard[];
  chatId: string;
  meetupLocation: string | null;
  meetupDate: string | null;
  reportedBy: string | null;
  reportReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  cardId: string;
  priority: WishlistPriority;
  maxQuantity: number;
  addedAt: string;
}

export interface TradeMatch {
  userId: string;
  displayName: string;
  theyCanGiveMe: string[];
  iCanGiveThem: string[];
  score: number;
}
