import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck, ShieldX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  year: string | null;
  roles: { role: string }[];
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          department,
          year
        `);

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get user emails directly from profiles query
      const combinedUsers = await Promise.all(
        profilesData.map(async (profile) => {
          const userRoles = rolesData?.filter((r) => r.user_id === profile.id) || [];
          
          // Get email from auth.users via RPC or just use profile id
          const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
          
          return {
            id: profile.id,
            full_name: profile.full_name,
            email: authData.user?.email || 'N/A',
            department: profile.department,
            year: profile.year,
            roles: userRoles,
          };
        })
      );

      setUsers(combinedUsers);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === 'promote') {
        const { error } = await supabase.from('user_roles').insert({
          user_id: selectedUser.id,
          role: 'admin',
        });
        if (error) throw error;
        toast.success(`${selectedUser.full_name} promoted to Admin`);
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('role', 'admin');
        if (error) throw error;
        toast.success(`${selectedUser.full_name} demoted to Student`);
      }

      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const isUserAdmin = (user: User) => {
    return user.roles.some((r) => r.role === 'admin' || r.role === 'super_admin');
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">ACCESS DENIED</h1>
          <p className="text-gray-400 mb-4">Super Admin access required</p>
          <Button onClick={() => navigate('/admin')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4">
        <Button
          onClick={() => navigate('/admin')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">User Management</h1>
            <p className="text-gray-400 text-sm">{users.length} total users</p>
          </div>

          <div className="border border-gray-850">
            <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-850 text-xs text-gray-500 font-mono">
              <div>NAME</div>
              <div>EMAIL</div>
              <div>DEPT</div>
              <div>ROLE</div>
              <div className="text-right">ACTIONS</div>
            </div>

            {users.map((user) => {
              const isAdmin = isUserAdmin(user);
              const isSuperAdmin = user.roles.some((r) => r.role === 'super_admin');

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-5 gap-4 p-4 border-b border-gray-850 hover:bg-gray-950 transition-colors items-center"
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-400">{user.email}</div>
                  <div className="text-sm text-gray-400">{user.department || 'N/A'}</div>
                  <div>
                    <Badge
                      variant={isAdmin ? 'default' : 'outline'}
                      className="text-xs font-mono"
                    >
                      {isSuperAdmin ? 'SUPER_ADMIN' : isAdmin ? 'ADMIN' : 'STUDENT'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {!isSuperAdmin && (
                      <>
                        {!isAdmin ? (
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('promote');
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            PROMOTE
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('demote');
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs"
                          >
                            <ShieldX className="w-3 h-3 mr-1" />
                            DEMOTE
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <AlertDialog open={!!selectedUser && !!actionType} onOpenChange={() => setSelectedUser(null)}>
        <AlertDialogContent className="bg-black border border-gray-850">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">
              {actionType === 'promote' ? 'Promote to Admin' : 'Demote to Student'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {actionType === 'promote'
                ? `Grant admin privileges to ${selectedUser?.full_name}? They will be able to manage events, complaints, and moderate content.`
                : `Remove admin privileges from ${selectedUser?.full_name}? They will return to student access only.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-850">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              className="bg-white text-black hover:bg-gray-200"
            >
              CONFIRM
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
