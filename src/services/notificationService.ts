import {
  collection, doc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification } from '../types/chat';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
}

export async function createNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  const ref = doc(collection(db, 'notifications', userId, 'items'));
  await setDoc(ref, {
    ...notification,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map((d) =>
    updateDoc(doc(db, 'notifications', userId, 'items', d.id), { read: true })
  );
  await Promise.all(updates);
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', userId, 'items', notificationId));
}
