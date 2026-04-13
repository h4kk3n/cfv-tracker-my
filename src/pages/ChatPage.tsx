import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle, Send, ArrowLeft, Plus, Search, CreditCard,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ChatMessageBubble from '../components/chat/ChatMessageBubble';
import { ChatRoom, ChatMessage } from '../types/chat';
import { Card } from '../types/card';
import {
  getUserChats, createDirectChat, sendMessage, sendCardMessage,
  subscribeToMessages, setTypingIndicator, subscribeToTyping,
  markMessagesAsRead, subscribeToPresence,
} from '../services/chatService';
import { getUserProfile, searchUsers } from '../services/userService';
import { searchCards } from '../services/cardService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { truncateText, formatRelativeTime } from '../utils/formatters';
import { UserProfile } from '../types/user';

interface ChatWithDetails extends ChatRoom {
  otherUserName: string;
  otherUserId: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { addToast } = useNotification();

  // Chat list state
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ChatWithDetails | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Presence state
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Card share modal
  const [showCardShare, setShowCardShare] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [cardResults, setCardResults] = useState<Card[]>([]);
  const [searchingCards, setSearchingCards] = useState(false);

  // ─── Load chats ───────────────────────────────────────────────
  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  const loadChats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rooms = await getUserChats(user.uid);
      const withDetails = await Promise.all(
        rooms.map(async (room) => {
          const otherId = room.participants.find((p) => p !== user.uid) || '';
          const profile = await getUserProfile(otherId);
          return {
            ...room,
            otherUserName: profile?.displayName || 'Unknown',
            otherUserId: otherId,
          };
        })
      );
      setChats(withDetails);
    } catch {
      setChats([]);
    }
    setLoading(false);
  };

  // ─── Presence tracking for chat participants ──────────────────
  useEffect(() => {
    if (chats.length === 0) return;
    const userIds = chats.map((c) => c.otherUserId).filter(Boolean);
    if (userIds.length === 0) return;

    const unsub = subscribeToPresence(userIds, (presence) => {
      const statusMap: Record<string, boolean> = {};
      for (const [uid, p] of Object.entries(presence)) {
        statusMap[uid] = p.online;
      }
      setOnlineStatus(statusMap);
    });
    return unsub;
  }, [chats]);

  // ─── Subscribe to active chat messages ────────────────────────
  useEffect(() => {
    if (!activeChat || !user) return;

    const unsubMsgs = subscribeToMessages(activeChat.id, (msgs) => {
      setMessages(msgs);
      markMessagesAsRead(activeChat.id, user.uid);
    });
    const unsubTyping = subscribeToTyping(activeChat.id, user.uid, setOtherTyping);

    return () => {
      unsubMsgs();
      unsubTyping();
    };
  }, [activeChat?.id, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send message ─────────────────────────────────────────────
  const handleSend = () => {
    if (!newMessage.trim() || !activeChat || !user) return;
    sendMessage(activeChat.id, user.uid, newMessage.trim());
    setNewMessage('');
    setTypingIndicator(activeChat.id, user.uid, false);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (activeChat && user) {
      setTypingIndicator(activeChat.id, user.uid, value.length > 0);
    }
  };

  // ─── New chat: search users ───────────────────────────────────
  const handleUserSearch = useCallback(async (term: string) => {
    setUserSearch(term);
    if (term.length < 2) { setUserResults([]); return; }
    setSearchingUsers(true);
    try {
      const results = await searchUsers(term);
      setUserResults(results.filter((u) => u.uid !== user?.uid));
    } catch {
      setUserResults([]);
    }
    setSearchingUsers(false);
  }, [user]);

  const handleStartChat = async (otherUserId: string, otherName: string) => {
    if (!user) return;
    try {
      const chatId = await createDirectChat(user.uid, otherUserId);
      setShowNewChat(false);
      setUserSearch('');
      setUserResults([]);

      // Reload chats and open the new one
      await loadChats();
      const rooms = await getUserChats(user.uid);
      const newRoom = rooms.find((r) => r.id === chatId);
      if (newRoom) {
        setActiveChat({
          ...newRoom,
          otherUserName: otherName,
          otherUserId,
        });
      }
      addToast('success', `Chat started with ${otherName}`);
    } catch {
      addToast('error', 'Failed to start chat');
    }
  };

  // ─── Card sharing ─────────────────────────────────────────────
  const handleCardSearch = useCallback(async (term: string) => {
    setCardSearch(term);
    if (term.length < 2) { setCardResults([]); return; }
    setSearchingCards(true);
    try {
      const results = await searchCards(term);
      setCardResults(results.slice(0, 20));
    } catch {
      setCardResults([]);
    }
    setSearchingCards(false);
  }, []);

  const handleShareCard = (card: Card) => {
    if (!activeChat || !user) return;
    sendCardMessage(activeChat.id, user.uid, card.id, card.nameEN, card.imageURL);
    setShowCardShare(false);
    setCardSearch('');
    setCardResults([]);
  };

  // ─── Select chat ──────────────────────────────────────────────
  const handleSelectChat = (chat: ChatWithDetails) => {
    setActiveChat(chat);
    setMessages([]);
    setNewMessage('');
    setOtherTyping(false);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button size="sm" onClick={() => setShowNewChat(true)}>
          <Plus size={16} className="mr-1" /> New Chat
        </Button>
      </div>

      {chats.length === 0 && !activeChat ? (
        <EmptyState
          icon={<MessageCircle size={48} />}
          title="No conversations yet"
          description="Start a chat with another player or create a trade to begin messaging."
          action={
            <Button onClick={() => setShowNewChat(true)}>
              <Plus size={16} className="mr-1" /> Start a Chat
            </Button>
          }
        />
      ) : (
        <div className="card-container overflow-hidden flex" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
          {/* Left Panel: Conversation List */}
          <div className={`w-full md:w-80 md:min-w-[320px] border-r border-gray-200 dark:border-gray-700 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {chats.length} Conversation{chats.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
                    activeChat?.id === chat.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <MessageCircle size={18} className="text-primary-600" />
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        onlineStatus[chat.otherUserId] ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{chat.otherUserName}</p>
                      {chat.lastMessageAt > 0 && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatRelativeTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {chat.type === 'trade' && (
                        <Badge variant="info" className="text-[10px] px-1.5 py-0">Trade</Badge>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {truncateText(chat.lastMessage || 'No messages yet', 40)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Active Chat */}
          <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <MessageCircle size={14} className="text-primary-600" />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        onlineStatus[activeChat.otherUserId] ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${activeChat.otherUserId}`} className="font-medium text-sm hover:text-primary-600">
                      {activeChat.otherUserName}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {onlineStatus[activeChat.otherUserId] ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                  {activeChat.type === 'trade' && activeChat.tradeId && (
                    <Link to={`/trades/${activeChat.tradeId}`}>
                      <Badge variant="info">View Trade</Badge>
                    </Link>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                  {messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.senderId === user?.uid}
                    />
                  ))}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-sm text-gray-500 italic">
                        typing...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <button
                    onClick={() => setShowCardShare(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-primary-600 transition-colors"
                    title="Share a card"
                  >
                    <CreditCard size={18} />
                  </button>
                  <input
                    className="input-field flex-1"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim()} size="sm">
                    <Send size={16} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a conversation or start a new chat</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <Modal isOpen={showNewChat} onClose={() => { setShowNewChat(false); setUserSearch(''); setUserResults([]); }} title="Start a New Chat">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input-field pl-9"
              placeholder="Search players by name or email..."
              value={userSearch}
              onChange={(e) => handleUserSearch(e.target.value)}
              autoFocus
            />
          </div>
          {searchingUsers && <div className="py-4"><Spinner /></div>}
          {userResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {userResults.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => handleStartChat(u.uid, u.displayName)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary-600">
                      {u.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  {u.location && (
                    <span className="text-xs text-gray-400">{u.location}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {userSearch.length >= 2 && !searchingUsers && userResults.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">No players found</p>
          )}
        </div>
      </Modal>

      {/* Card Share Modal */}
      <Modal isOpen={showCardShare} onClose={() => { setShowCardShare(false); setCardSearch(''); setCardResults([]); }} title="Share a Card">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input-field pl-9"
              placeholder="Search cards by name or number..."
              value={cardSearch}
              onChange={(e) => handleCardSearch(e.target.value)}
              autoFocus
            />
          </div>
          {searchingCards && <div className="py-4"><Spinner /></div>}
          {cardResults.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-1">
              {cardResults.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleShareCard(card)}
                  className="w-full p-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-14 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                    {card.imageURL && (
                      <img src={card.imageURL} alt={card.nameEN} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{card.nameEN}</p>
                    <p className="text-xs text-gray-500 truncate">{card.cardNumber} - {card.nameJP}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="info">{`G${card.grade}`}</Badge>
                    <Badge>{card.nation}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
          {cardSearch.length >= 2 && !searchingCards && cardResults.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">No cards found</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
