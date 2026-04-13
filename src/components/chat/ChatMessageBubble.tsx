import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import { ChatMessage } from '../../types/chat';
import { formatRelativeTime } from '../../utils/formatters';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export default function ChatMessageBubble({ message, isOwn }: ChatMessageBubbleProps) {
  const isCard = message.type === 'card' && message.cardId;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-xl text-sm ${
          isOwn
            ? 'bg-primary-600 text-white rounded-br-none'
            : 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'
        } ${isCard ? 'overflow-hidden' : 'px-3 py-2'}`}
      >
        {isCard ? (
          <Link to={`/cards/${message.cardId}`} className="block hover:opacity-90 transition-opacity">
            {message.cardImage && (
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 overflow-hidden">
                <img
                  src={message.cardImage}
                  alt={message.cardName || 'Card'}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="info">Card</Badge>
                <span className={`font-medium text-xs ${isOwn ? 'text-white' : ''}`}>
                  {message.cardName || 'Unknown Card'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                {formatRelativeTime(message.timestamp)}
              </p>
            </div>
          </Link>
        ) : (
          <>
            <p>{message.text}</p>
            <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
              {formatRelativeTime(message.timestamp)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
