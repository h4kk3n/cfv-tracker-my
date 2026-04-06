import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { ChatRoom } from '../types/chat';
import { getUserChats } from '../services/chatService';
import { getUserProfile } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime, truncateText } from '../utils/formatters';

interface ChatWithName extends ChatRoom {
  otherUserName: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  const loadChats = async () => {
    if (!user) return;
    setLoading(true);
    const rooms = await getUserChats(user.uid);
    const withNames = await Promise.all(
      rooms.map(async (room) => {
        const otherId = room.participants.find((p) => p !== user.uid) || '';
        const profile = await getUserProfile(otherId);
        return { ...room, otherUserName: profile?.displayName || 'Unknown' };
      })
    );
    setChats(withNames);
    setLoading(false);
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>

      {chats.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={48} />}
          title="No conversations yet"
          description="Start a trade to begin chatting with other players."
          action={<Link to="/trades"><button className="btn-primary">Go to Trading Hub</button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link key={chat.id} to={`/trades/${chat.tradeId}`} className="card-container p-4 flex items-center gap-4 hover:shadow-md transition-shadow block">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{chat.otherUserName}</p>
                <p className="text-xs text-gray-500 truncate">{truncateText(chat.lastMessage || 'No messages yet', 60)}</p>
              </div>
              {chat.lastMessageAt > 0 && (
                <span className="text-xs text-gray-400">{formatRelativeTime(chat.lastMessageAt)}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
