export type MessageType = 'text' | 'card';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
  type?: MessageType;
  cardId?: string;
  cardName?: string;
  cardImage?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  tradeId: string;
  lastMessage: string;
  lastMessageAt: number;
  type?: 'direct' | 'trade';
}

export interface UserPresence {
  online: boolean;
  lastSeen: number;
}

export interface Notification {
  id: string;
  type: 'trade_proposal' | 'trade_accepted' | 'trade_completed' | 'new_message' | 'match_found';
  title: string;
  body: string;
  linkTo: string;
  read: boolean;
  createdAt: string;
}
