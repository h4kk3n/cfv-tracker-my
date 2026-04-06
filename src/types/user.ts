export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  reputation: number;
  completedTrades: number;
  location: string;
  bio: string;
  createdAt: string;
  lastActive: string;
}
