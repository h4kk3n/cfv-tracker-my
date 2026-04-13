import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Trade, TradeStatus, TradeCard } from '../types/trade';
import { normalizeTimestamp } from '../utils/formatters';
import { createTradeChat } from './chatService';

function normalizeTrade(id: string, data: Record<string, unknown>): Trade {
  return {
    ...data,
    id,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    completedAt: data.completedAt ? normalizeTimestamp(data.completedAt) : null,
  } as Trade;
}

export async function createTrade(
  initiatorId: string,
  receiverId: string,
  initiatorCards: TradeCard[],
  receiverCards: TradeCard[]
): Promise<string> {
  // Create trade document in Firestore first
  const tradeRef = await addDoc(collection(db, 'trades'), {
    initiatorId,
    receiverId,
    status: 'pending' as TradeStatus,
    initiatorCards,
    receiverCards,
    chatId: '', // will be set after chat creation
    meetupLocation: null,
    meetupDate: null,
    reportedBy: null,
    reportReason: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create chat room in RTDB with tradeId + userChats index
  const chatId = await createTradeChat(initiatorId, receiverId, tradeRef.id);

  // Update trade with chatId
  await updateDoc(doc(db, 'trades', tradeRef.id), { chatId });

  return tradeRef.id;
}

export async function getTrade(tradeId: string): Promise<Trade | null> {
  const docSnap = await getDoc(doc(db, 'trades', tradeId));
  if (!docSnap.exists()) return null;
  return normalizeTrade(docSnap.id, docSnap.data());
}

export async function getUserTrades(userId: string): Promise<Trade[]> {
  const q1 = query(collection(db, 'trades'), where('initiatorId', '==', userId), orderBy('createdAt', 'desc'));
  const q2 = query(collection(db, 'trades'), where('receiverId', '==', userId), orderBy('createdAt', 'desc'));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const trades = [
    ...snap1.docs.map((d) => normalizeTrade(d.id, d.data())),
    ...snap2.docs.map((d) => normalizeTrade(d.id, d.data())),
  ];

  // Deduplicate (a trade could appear in both queries if initiator === receiver in theory)
  const seen = new Set<string>();
  const unique = trades.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return unique.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function updateTradeStatus(tradeId: string, status: TradeStatus): Promise<void> {
  if (status === 'completed') {
    await updateDoc(doc(db, 'trades', tradeId), { status, updatedAt: serverTimestamp(), completedAt: serverTimestamp() });
  } else {
    await updateDoc(doc(db, 'trades', tradeId), { status, updatedAt: serverTimestamp() });
  }
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
  return snapshot.docs.map((d) => normalizeTrade(d.id, d.data()));
}
