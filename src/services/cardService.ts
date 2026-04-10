import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  writeBatch, DocumentSnapshot,
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

  // Delete in batches of 500
  for (let i = 0; i < toDelete.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = toDelete.slice(i, i + 500);
    for (const id of chunk) {
      batch.delete(doc(db, CARDS_COLLECTION, id));
    }
    await batch.commit();
  }

  return toDelete.length;
}

export async function deleteAllCards(): Promise<number> {
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  const docs = snapshot.docs;
  let count = 0;

  // Delete in batches of 500 (Firestore max per batch)
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    for (const d of chunk) {
      batch.delete(doc(db, CARDS_COLLECTION, d.id));
    }
    await batch.commit();
    count += chunk.length;
  }

  return count;
}

export async function getExistingCardNames(): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, CARDS_COLLECTION));
  return new Set(
    snapshot.docs.map((d) => (d.data().nameEN as string || '').toLowerCase())
  );
}

export async function importCardsBatch(
  cards: Omit<Card, 'id' | 'searchTokens' | 'updatedAt'>[],
  existingNames: Set<string>,
): Promise<number> {
  const toAdd = cards.filter(card => {
    const nameLower = (card.nameEN || '').toLowerCase();
    return nameLower && !existingNames.has(nameLower);
  });

  if (toAdd.length === 0) return 0;

  const batch = writeBatch(db);
  for (const card of toAdd) {
    const searchTokens = generateSearchTokens(card);
    const docRef = doc(collection(db, CARDS_COLLECTION));
    batch.set(docRef, { ...card, searchTokens, updatedAt: serverTimestamp() });
    existingNames.add((card.nameEN || '').toLowerCase());
  }
  await batch.commit();
  return toAdd.length;
}
