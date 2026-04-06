import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Check, X as XIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import Spinner from '../components/ui/Spinner';
import { Trade } from '../types/trade';
import { ChatMessage } from '../types/chat';

import { getTrade, updateTradeStatus } from '../services/tradeService';
import { sendMessage, subscribeToMessages, setTypingIndicator, subscribeToTyping, markMessagesAsRead } from '../services/chatService';
import { getCardById } from '../services/cardService';
import { getUserProfile } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { TRADE_STATUS_COLORS, TRADE_STATUS_LABELS } from '../utils/constants';
import { formatRelativeTime } from '../utils/formatters';
import { UserProfile } from '../types/user';

export default function TradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardNames, setCardNames] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tradeId) loadTrade();
  }, [tradeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!trade?.chatId || !user) return;
    const unsubMsgs = subscribeToMessages(trade.chatId, (msgs) => {
      setMessages(msgs);
      markMessagesAsRead(trade.chatId, user.uid);
    });
    const unsubTyping = subscribeToTyping(trade.chatId, user.uid, setOtherTyping);
    return () => { unsubMsgs(); unsubTyping(); };
  }, [trade?.chatId, user]);

  const loadTrade = async () => {
    if (!tradeId || !user) return;
    setLoading(true);
    const t = await getTrade(tradeId);
    if (t) {
      setTrade(t);
      const otherId = t.initiatorId === user.uid ? t.receiverId : t.initiatorId;
      const profile = await getUserProfile(otherId);
      setOtherUser(profile);

      const allCardIds = [...t.initiatorCards.map((c) => c.cardId), ...t.receiverCards.map((c) => c.cardId)];
      const names: Record<string, string> = {};
      await Promise.all(allCardIds.map(async (id) => {
        const card = await getCardById(id);
        if (card) names[id] = card.nameEN;
      }));
      setCardNames(names);
    }
    setLoading(false);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !trade?.chatId || !user) return;
    sendMessage(trade.chatId, user.uid, newMessage.trim());
    setNewMessage('');
    setTypingIndicator(trade.chatId, user.uid, false);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (trade?.chatId && user) {
      setTypingIndicator(trade.chatId, user.uid, value.length > 0);
    }
  };

  const handleStatusChange = async (status: 'accepted' | 'declined' | 'completed' | 'cancelled') => {
    if (!trade) return;
    await updateTradeStatus(trade.id, status);
    setTrade({ ...trade, status });
    addToast('success', `Trade ${status}`);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!trade) return <div className="py-20 text-center">Trade not found</div>;

  const isInitiator = trade.initiatorId === user?.uid;

  return (
    <div className="space-y-6">
      <Link to="/trades" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeft size={16} /> Back to Trading Hub
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trade with {otherUser?.displayName || 'Unknown'}</h1>
          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${TRADE_STATUS_COLORS[trade.status]}`}>
            {TRADE_STATUS_LABELS[trade.status]}
          </span>
        </div>
        {trade.status === 'pending' && !isInitiator && (
          <div className="flex gap-2">
            <Button onClick={() => handleStatusChange('accepted')}><Check size={16} className="mr-1" /> Accept</Button>
            <Button variant="danger" onClick={() => handleStatusChange('declined')}><XIcon size={16} className="mr-1" /> Decline</Button>
          </div>
        )}
        {trade.status === 'accepted' && (
          <Button onClick={() => handleStatusChange('completed')}><Check size={16} className="mr-1" /> Mark Completed</Button>
        )}
        {(trade.status === 'pending' || trade.status === 'discussing') && isInitiator && (
          <Button variant="danger" size="sm" onClick={() => handleStatusChange('cancelled')}>Cancel Trade</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offered cards */}
        <div className="card-container p-4">
          <h3 className="font-semibold mb-3">{isInitiator ? 'You Offer' : 'They Offer'}</h3>
          <div className="space-y-2">
            {trade.initiatorCards.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <Link to={`/cards/${c.cardId}`} className="hover:text-primary-600">{cardNames[c.cardId] || c.cardId}</Link>
                <Badge>x{c.quantity}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="card-container p-4">
          <h3 className="font-semibold mb-3">{isInitiator ? 'You Request' : 'They Request'}</h3>
          <div className="space-y-2">
            {trade.receiverCards.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <Link to={`/cards/${c.cardId}`} className="hover:text-primary-600">{cardNames[c.cardId] || c.cardId}</Link>
                <Badge>x{c.quantity}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="card-container">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Chat</h3>
        </div>
        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-center text-sm text-gray-400">No messages yet. Start the conversation!</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                msg.senderId === user?.uid
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'
              }`}>
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-200' : 'text-gray-400'}`}>
                  {formatRelativeTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-sm text-gray-500 italic">typing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
