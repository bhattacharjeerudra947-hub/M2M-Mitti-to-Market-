import { useAuth } from '../../context/AuthContext';
import { Avatar, KV } from '../../components/admin/ui/adminUi';

export default function AdminSettings() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">Your administrator account profile.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <Avatar src={user.profilePhotoUrl} name={user.name} size={48} />
          <div>
            <p className="text-[15px] font-semibold text-gray-900">{user.name}</p>
            <p className="text-[13px] text-gray-500">Administrator · ROLE_ADMIN</p>
          </div>
        </div>
        <div className="px-6 py-3">
          <KV k="Name" v={user.name} />
          <KV k="Email" v={user.email} />
          <KV k="Phone" v={user.phone || '—'} />
          <KV k="Role" v="ADMIN" />
          <KV k="Account status" v={(user.status || 'ACTIVE').toLowerCase()} />
          <KV k="Member since" v={user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        </div>
      </div>
    </div>
  );
}
