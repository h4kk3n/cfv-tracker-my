import { doc, getDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, UserRole } from '../types/user';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (!docSnap.exists()) return null;
  return { uid, ...docSnap.data() } as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const { uid: _uid, ...updateData } = data;
  await updateDoc(doc(db, 'users', uid), { ...updateData, lastActive: serverTimestamp() });
}

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  const term = searchTerm.toLowerCase();
  return snapshot.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
    .filter((u) => u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
}
