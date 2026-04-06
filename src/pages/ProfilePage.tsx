import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, MapPin, Star, ArrowLeftRight, Calendar, Edit2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { UserProfile } from '../types/user';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, refreshProfile } = useAuth();
  const { addToast } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');

  const isOwn = user?.uid === userId;

  useEffect(() => {
    if (userId) {
      getUserProfile(userId).then((p) => { setProfile(p); setLoading(false); });
    }
  }, [userId]);

  const handleEdit = async () => {
    if (!userId) return;
    try {
      await updateUserProfile(userId, { displayName: editName, location: editLocation, bio: editBio });
      setProfile((p) => p ? { ...p, displayName: editName, location: editLocation, bio: editBio } : p);
      await refreshProfile();
      setShowEdit(false);
      addToast('success', 'Profile updated');
    } catch {
      addToast('error', 'Failed to update profile');
    }
  };

  const openEdit = () => {
    if (profile) {
      setEditName(profile.displayName);
      setEditLocation(profile.location);
      setEditBio(profile.bio);
      setShowEdit(true);
    }
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!profile) return <div className="py-20 text-center">User not found</div>;

  const roleBadge = { user: 'default', moderator: 'info', admin: 'danger' } as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card-container p-8 text-center">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User size={32} className="text-primary-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{profile.displayName}</h1>
        <Badge variant={roleBadge[profile.role]} className="mt-1">{profile.role}</Badge>
        {profile.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{profile.bio}</p>}

        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
          {profile.location && (
            <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>
          )}
          <span className="flex items-center gap-1"><Calendar size={14} /> Joined {formatDate(profile.createdAt)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="card-container p-4">
            <Star size={24} className="text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile.reputation}</p>
            <p className="text-xs text-gray-500">Reputation</p>
          </div>
          <div className="card-container p-4">
            <ArrowLeftRight size={24} className="text-primary-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile.completedTrades}</p>
            <p className="text-xs text-gray-500">Trades Completed</p>
          </div>
        </div>

        {isOwn && (
          <Button variant="secondary" className="mt-6" onClick={openEdit}>
            <Edit2 size={16} className="mr-1" /> Edit Profile
          </Button>
        )}
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="Display Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Kuala Lumpur" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea className="input-field" rows={3} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell others about yourself..." />
          </div>
          <Button className="w-full" onClick={handleEdit}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
}
