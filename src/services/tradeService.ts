import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { db, rtdb } from '../config/firebase';
import { Trade, TradeStatus, TradeCard } from '../types/trade';

export async function createTrade(
  initiatorId: string,
  receiverId: string,
  initiatorCards: TradeCard[],
  receiverCards: TradeCard[]
): Promise<string> {
  // Create chat room in Realtime Database
  const chatId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const chatRef = ref(rtdb, `chats/${chatId}`);
  await set(chatRef, {
    participants: { [initiatorId]: true, [receiverId]: true },
    metadata: {
      createdAt: Date.now(),
      lastMessage: '',
      lastMessageAt: Date.now(),
    },
  });

  // Create trade document in Firestore
  const tradeRef = await addDoc(collection(db, 'trades'), {
    initiatorId,
    receiverId,
    status: 'pending' as TradeStatus,
    initiatorCards,
    receiverCards,
    chatId,
    meetupLocation: null,
    meetupDate: null,
    reportedBy: null,
    reportReason: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return tradeRef.id;
}

export async function getTrade(tradeId: string): Promise<Trade | null> {
  const docSnap = await getDoc(doc(db, 'trades', tradeId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Trade;
}

export async function getUserTrades(userId: string): Promise<Trade[]> {
  const q1 = query(collection(db, 'trades'), where('initiatorId', '==', userId), orderBy('createdAt', 'desc'));
  const q2 = query(collection(db, 'trades'), where('receiverId', '==', userId), orderBy('createdAt', 'desc'));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const trades = [
    ...snap1.docs.map((d) => ({ id: d.id, ...d.data() }) as Trade),
    ...snap2.docs.map((d) => ({ id: d.id, ...d.data() }) as Trade),
  ];

  return trades.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function updateTradeStatus(tradeId: string, status: TradeStatus): Promise<void> {
  const update: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (status === 'completed') {
    update.completedAt = serverTimestamp();
  }
  await updateDoc(doc(db, 'trades', tradeId), update);
}

export async function reportTrade(tradeId: string, reportedBy: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'trades', tradeId), {
    status: 'disputed',
    reportedBy,
    reportReason: reason,
    updatedAt: serverTimestamp(),
  });
}

export async function updateTradeCards(
  tradeId: string,
  initiatorCards: TradeCard[],
  receiverCards: TradeCard[]
): Promise<void> {
  await updateDoc(doc(db, 'trades', tradeId), {
    initiatorCards,
    receiverCards,
    updatedAt: serverTimestamp(),
  });
}

export async function getReportedTrades(): Promise<Trade[]> {
  const q = query(collection(db, 'trades'), where('status', '==', 'disputed'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Trade);
}
