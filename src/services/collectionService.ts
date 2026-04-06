import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CollectionItem } from '../types/collection';

function collectionRef(userId: string) {
  return collection(db, 'collections', userId, 'items');
}

export async function getCollection(userId: string): Promise<CollectionItem[]> {
  const snapshot = await getDocs(collectionRef(userId));
  return snapshot.docs.map((d) => ({ cardId: d.id, ...d.data() }) as CollectionItem);
}

export async function getCollectionItem(userId: string, cardId: string): Promise<CollectionItem | null> {
  const docSnap = await getDoc(doc(db, 'collections', userId, 'items', cardId));
  if (!docSnap.exists()) return null;
  return { cardId: docSnap.id, ...docSnap.data() } as CollectionItem;
}

export async function setCollectionItem(userId: string, item: CollectionItem): Promise<void> {
  await setDoc(doc(db, 'collections', userId, 'items', item.cardId), {
    quantity: item.quantity,
    forTrade: item.forTrade,
    condition: item.condition,
    notes: item.notes,
    updatedAt: serverTimestamp(),
  });
}

export async function removeFromCollection(userId: string, cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'collections', userId, 'items', cardId));
}

export async function updateQuantity(userId: string, cardId: string, quantity: number, forTrade: number): Promise<void> {
  await setDoc(doc(db, 'collections', userId, 'items', cardId), {
    quantity,
    forTrade: Math.min(forTrade, quantity),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getUsersWithForTrade(): Promise<{ userId: string; items: CollectionItem[] }[]> {
  // This gets all users' collections - works for small community
  // For scale, use Cloud Functions to index forTrade > 0
  const usersSnap = await getDocs(collection(db, 'collections'));
  const results: { userId: string; items: CollectionItem[] }[] = [];
  for (const userDoc of usersSnap.docs) {
    const itemsSnap = await getDocs(collection(db, 'collections', userDoc.id, 'items'));
    const items = itemsSnap.docs
      .map((d) => ({ cardId: d.id, ...d.data() }) as CollectionItem)
      .filter((item) => item.forTrade > 0);
    if (items.length > 0) {
      results.push({ userId: userDoc.id, items });
    }
  }
  return results;
}
