import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function registerUser(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await setDoc(doc(db, 'users', credential.user.uid), {
    email,
    displayName,
    photoURL: null,
    role: 'user',
    reputation: 0,
    completedTrades: 0,
    location: '',
    bio: '',
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  });
  return credential.user;
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const userDoc = doc(db, 'users', credential.user.uid);
  await setDoc(userDoc, {
    email: credential.user.email,
    displayName: credential.user.displayName || 'User',
    photoURL: credential.user.photoURL,
    role: 'user',
    reputation: 0,
    completedTrades: 0,
    location: '',
    bio: '',
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  }, { merge: true });
  return credential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}
