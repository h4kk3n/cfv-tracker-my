import {
  ref, push, set, onValue, query as rtdbQuery, orderByChild, limitToLast, off, get,
} from 'firebase/database';
import { rtdb } from '../config/firebase';
import { ChatMessage, ChatRoom } from '../types/chat';

export function sendMessage(chatId: string, senderId: string, text: string): void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  set(newMsgRef, {
    senderId,
    text,
    timestamp: Date.now(),
    read: false,
  });

  // Update last message metadata
  set(ref(rtdb, `chats/${chatId}/metadata/lastMessage`), text);
  set(ref(rtdb, `chats/${chatId}/metadata/lastMessageAt`), Date.now());
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const q = rtdbQuery(messagesRef, orderByChild('timestamp'), limitToLast(100));

  const handler = onValue(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key!, ...child.val() });
    });
    callback(messages);
  });

  return () => off(messagesRef);
}

export function setTypingIndicator(chatId: string, userId: string, isTyping: boolean): void {
  set(ref(rtdb, `chats/${chatId}/typing/${userId}`), isTyping);
}

export function subscribeToTyping(
  chatId: string,
  userId: string,
  callback: (isTyping: boolean) => void
): () => void {
  const typingRef = ref(rtdb, `chats/${chatId}/typing`);

  const handler = onValue(typingRef, (snapshot) => {
    const typing = snapshot.val() || {};
    const otherTyping = Object.entries(typing).some(
      ([uid, val]) => uid !== userId && val === true
    );
    callback(otherTyping);
  });

  return () => off(typingRef);
}

export async function getUserChats(userId: string): Promise<ChatRoom[]> {
  const chatsRef = ref(rtdb, 'chats');
  const snapshot = await get(chatsRef);

  if (!snapshot.exists()) return [];

  const rooms: ChatRoom[] = [];
  snapshot.forEach((child) => {
    const data = child.val();
    if (data.participants && data.participants[userId]) {
      rooms.push({
        id: child.key!,
        participants: Object.keys(data.participants),
        tradeId: data.metadata?.tradeId || '',
        lastMessage: data.metadata?.lastMessage || '',
        lastMessageAt: data.metadata?.lastMessageAt || 0,
      });
    }
  });

  return rooms.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function markMessagesAsRead(chatId: string, userId: string): void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  get(messagesRef).then((snapshot) => {
    snapshot.forEach((child) => {
      const msg = child.val();
      if (msg.senderId !== userId && !msg.read) {
        set(ref(rtdb, `chats/${chatId}/messages/${child.key}/read`), true);
      }
    });
  });
}
