import {
  ref, push, set, get, onValue, query as rtdbQuery,
  orderByChild, limitToLast, off, onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import { rtdb } from '../config/firebase';
import { ChatMessage, ChatRoom, UserPresence } from '../types/chat';

// ─── Chat Room Management ───────────────────────────────────────────

export async function createDirectChat(
  userId1: string,
  userId2: string
): Promise<string> {
  // Check if a direct chat already exists between these users
  const existingChatId = await findDirectChat(userId1, userId2);
  if (existingChatId) return existingChatId;

  const chatId = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const chatRef = ref(rtdb, `chats/${chatId}`);

  await set(chatRef, {
    participants: { [userId1]: true, [userId2]: true },
    metadata: {
      type: 'direct',
      createdAt: Date.now(),
      lastMessage: '',
      lastMessageAt: Date.now(),
    },
  });

  // Write userChats index for both users
  await Promise.all([
    set(ref(rtdb, `userChats/${userId1}/${chatId}`), {
      otherUserId: userId2,
      type: 'direct',
      updatedAt: Date.now(),
    }),
    set(ref(rtdb, `userChats/${userId2}/${chatId}`), {
      otherUserId: userId1,
      type: 'direct',
      updatedAt: Date.now(),
    }),
  ]);

  return chatId;
}

export async function createTradeChat(
  userId1: string,
  userId2: string,
  tradeId: string
): Promise<string> {
  const chatId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const chatRef = ref(rtdb, `chats/${chatId}`);

  await set(chatRef, {
    participants: { [userId1]: true, [userId2]: true },
    metadata: {
      type: 'trade',
      tradeId,
      createdAt: Date.now(),
      lastMessage: '',
      lastMessageAt: Date.now(),
    },
  });

  // Write userChats index for both users
  await Promise.all([
    set(ref(rtdb, `userChats/${userId1}/${chatId}`), {
      otherUserId: userId2,
      type: 'trade',
      tradeId,
      updatedAt: Date.now(),
    }),
    set(ref(rtdb, `userChats/${userId2}/${chatId}`), {
      otherUserId: userId1,
      type: 'trade',
      tradeId,
      updatedAt: Date.now(),
    }),
  ]);

  return chatId;
}

async function findDirectChat(userId1: string, userId2: string): Promise<string | null> {
  const snapshot = await get(ref(rtdb, `userChats/${userId1}`));
  if (!snapshot.exists()) return null;

  let found: string | null = null;
  snapshot.forEach((child) => {
    const data = child.val();
    if (data.type === 'direct' && data.otherUserId === userId2) {
      found = child.key;
    }
  });
  return found;
}

// ─── Chat Listing (uses userChats index) ────────────────────────────

export async function getUserChats(userId: string): Promise<ChatRoom[]> {
  // Read from userChats index (user has read permission on their own index)
  const indexSnapshot = await get(ref(rtdb, `userChats/${userId}`));
  if (!indexSnapshot.exists()) return [];

  const chatIds: { id: string; otherUserId: string; type: string; tradeId?: string }[] = [];
  indexSnapshot.forEach((child) => {
    const data = child.val();
    chatIds.push({
      id: child.key!,
      otherUserId: data.otherUserId,
      type: data.type,
      tradeId: data.tradeId,
    });
  });

  // Fetch metadata for each chat (user has read permission as participant)
  const rooms: ChatRoom[] = [];
  await Promise.all(
    chatIds.map(async (entry) => {
      try {
        const metaSnap = await get(ref(rtdb, `chats/${entry.id}/metadata`));
        const meta = metaSnap.exists() ? metaSnap.val() : {};
        const partSnap = await get(ref(rtdb, `chats/${entry.id}/participants`));
        const participants = partSnap.exists() ? Object.keys(partSnap.val()) : [];

        rooms.push({
          id: entry.id,
          participants,
          tradeId: meta.tradeId || entry.tradeId || '',
          lastMessage: meta.lastMessage || '',
          lastMessageAt: meta.lastMessageAt || 0,
          type: (meta.type || entry.type || 'direct') as 'direct' | 'trade',
        });
      } catch {
        // Chat may have been deleted or permissions changed, skip
      }
    })
  );

  return rooms.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

// ─── Messages ───────────────────────────────────────────────────────

export function sendMessage(chatId: string, senderId: string, text: string): void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  set(newMsgRef, {
    senderId,
    text,
    timestamp: Date.now(),
    read: false,
    type: 'text',
  });

  // Update last message metadata
  set(ref(rtdb, `chats/${chatId}/metadata/lastMessage`), text);
  set(ref(rtdb, `chats/${chatId}/metadata/lastMessageAt`), Date.now());
}

export function sendCardMessage(
  chatId: string,
  senderId: string,
  cardId: string,
  cardName: string,
  cardImage: string
): void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  set(newMsgRef, {
    senderId,
    text: `Shared a card: ${cardName}`,
    timestamp: Date.now(),
    read: false,
    type: 'card',
    cardId,
    cardName,
    cardImage,
  });

  set(ref(rtdb, `chats/${chatId}/metadata/lastMessage`), `📋 ${cardName}`);
  set(ref(rtdb, `chats/${chatId}/metadata/lastMessageAt`), Date.now());
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const q = rtdbQuery(messagesRef, orderByChild('timestamp'), limitToLast(100));

  onValue(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key!, ...child.val() });
    });
    callback(messages);
  });

  return () => off(messagesRef);
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

// ─── Typing Indicators ─────────────────────────────────────────────

export function setTypingIndicator(chatId: string, userId: string, isTyping: boolean): void {
  set(ref(rtdb, `chats/${chatId}/typing/${userId}`), isTyping);
}

export function subscribeToTyping(
  chatId: string,
  userId: string,
  callback: (isTyping: boolean) => void
): () => void {
  const typingRef = ref(rtdb, `chats/${chatId}/typing`);

  onValue(typingRef, (snapshot) => {
    const typing = snapshot.val() || {};
    const otherTyping = Object.entries(typing).some(
      ([uid, val]) => uid !== userId && val === true
    );
    callback(otherTyping);
  });

  return () => off(typingRef);
}

// ─── Presence System ────────────────────────────────────────────────

export function setupPresence(userId: string): () => void {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // User is online
      set(presenceRef, { online: true, lastSeen: Date.now() });

      // When user disconnects, set offline with server timestamp
      onDisconnect(presenceRef).set({
        online: false,
        lastSeen: rtdbServerTimestamp(),
      });
    }
  });

  return () => {
    off(connectedRef);
    set(presenceRef, { online: false, lastSeen: Date.now() });
    unsubscribe();
  };
}

export function subscribeToPresence(
  userIds: string[],
  callback: (presence: Record<string, UserPresence>) => void
): () => void {
  const unsubscribers: (() => void)[] = [];
  const state: Record<string, UserPresence> = {};

  for (const uid of userIds) {
    const presRef = ref(rtdb, `presence/${uid}`);
    onValue(presRef, (snap) => {
      state[uid] = snap.exists()
        ? snap.val()
        : { online: false, lastSeen: 0 };
      callback({ ...state });
    });
    unsubscribers.push(() => off(presRef));
  }

  return () => unsubscribers.forEach((fn) => fn());
}

export async function getPresence(userId: string): Promise<UserPresence> {
  const snap = await get(ref(rtdb, `presence/${userId}`));
  return snap.exists() ? snap.val() : { online: false, lastSeen: 0 };
}
