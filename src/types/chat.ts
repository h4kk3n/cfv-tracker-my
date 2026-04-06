export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  tradeId: string;
  lastMessage: string;
  lastMessageAt: number;
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
