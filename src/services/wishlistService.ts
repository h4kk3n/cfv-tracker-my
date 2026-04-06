import {
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WishlistItem } from '../types/trade';

function wishlistRef(userId: string) {
  return collection(db, 'wishlists', userId, 'items');
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const snapshot = await getDocs(wishlistRef(userId));
  return snapshot.docs.map((d) => ({ cardId: d.id, ...d.data() }) as WishlistItem);
}

export async function addToWishlist(userId: string, item: WishlistItem): Promise<void> {
  await setDoc(doc(db, 'wishlists', userId, 'items', item.cardId), {
    priority: item.priority,
    maxQuantity: item.maxQuantity,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromWishlist(userId: string, cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'wishlists', userId, 'items', cardId));
}

export async function updateWishlistPriority(userId: string, cardId: string, priority: string): Promise<void> {
  await setDoc(doc(db, 'wishlists', userId, 'items', cardId), { priority }, { merge: true });
}
