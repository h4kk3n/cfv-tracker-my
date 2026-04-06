import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from '../types/card';

const CARDS_COLLECTION = 'cards';

function generateSearchTokens(card: Partial<Card>): string[] {
  const tokens: string[] = [];
  const fields = [card.nameEN, card.nameJP, card.nameRomaji, card.cardNumber];
  for (const field of fields) {
    if (field) {
      const lower = field.toLowerCase();
      tokens.push(lower);
      const words = lower.split(/[\s\-\/]+/);
      tokens.push(...words.filter((w) => w.length > 1));
    }
  }
  return [...new Set(tokens)];
}

export async function getCards(pageSize: number = 24, lastDoc?: DocumentSnapshot): Promise<{ cards: Card[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(collection(db, CARDS_COLLECTION), orderBy('cardNumber'), limit(pageSize));
  if (lastDoc) {
    q = query(collection(db, CARDS_COLLECTION), orderBy('cardNumber'), startAfter(lastDoc), limit(pageSize));
  }
  const snapshot = await getDocs(q);
  const cards = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Card);
  const last = snapshot.docs[snapshot.docs.length - 1] || null;
  return { cards, lastDoc: last };
}

export async function getCardById(id: string): Promise<Card | null> {
  const docSnap = await getDoc(doc(db, CARDS_COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Card;
}

export async function searchCards(searchTerm: string): Promise<Card[]> {
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  const term = searchTerm.toLowerCase();
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Card)
    .filter((card) =>
      card.nameEN.toLowerCase().includes(term) ||
      card.nameJP.includes(term) ||
      card.nameRomaji.toLowerCase().includes(term) ||
      card.cardNumber.toLowerCase().includes(term)
    );
}

export async function getCardsByNation(nation: string): Promise<Card[]> {
  const q = query(collection(db, CARDS_COLLECTION), where('nation', '==', nation));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Card);
}

export async function addCard(cardData: Omit<Card, 'id' | 'searchTokens' | 'updatedAt'>): Promise<string> {
  const searchTokens = generateSearchTokens(cardData);
  const docRef = await addDoc(collection(db, CARDS_COLLECTION), {
    ...cardData,
    searchTokens,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCard(id: string, cardData: Partial<Card>): Promise<void> {
  const searchTokens = generateSearchTokens(cardData);
  await updateDoc(doc(db, CARDS_COLLECTION, id), {
    ...cardData,
    searchTokens,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCard(id: string): Promise<void> {
  await deleteDoc(doc(db, CARDS_COLLECTION, id));
}

export async function removeDuplicateCards(): Promise<number> {
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  const seen = new Map<string, string>(); // nameEN -> first doc id
  const toDelete: string[] = [];

  for (const d of snapshot.docs) {
    const name = ((d.data().nameEN as string) || '').toLowerCase().trim();
    if (!name) continue;
    if (seen.has(name)) {
      toDelete.push(d.id); // duplicate — mark for deletion
    } else {
      seen.set(name, d.id);
    }
  }

  for (const id of toDelete) {
    await deleteDoc(doc(db, CARDS_COLLECTION, id));
  }

  return toDelete.length;
}

export async function deleteAllCards(): Promise<number> {
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  let count = 0;
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, CARDS_COLLECTION, d.id));
    count++;
  }
  return count;
}

export async function importCards(cards: Omit<Card, 'id' | 'searchTokens' | 'updatedAt'>[]): Promise<number> {
  // Fetch all existing card names to check for duplicates
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  const existingNames = new Set(
    snapshot.docs.map((d) => (d.data().nameEN as string || '').toLowerCase())
  );

  let count = 0;
  for (const card of cards) {
    const nameLower = (card.nameEN || '').toLowerCase();
    if (nameLower && existingNames.has(nameLower)) {
      continue; // Skip duplicate
    }
    await addCard(card);
    existingNames.add(nameLower);
    count++;
  }
  return count;
}
