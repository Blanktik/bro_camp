import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck, ShieldX, AlertTriangle, Ban, Clock } from 'lucide-react';
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
  warningCount?: number;
  isBanned?: boolean;
  isTimedOut?: boolean;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | 'warning' | 'timeout' | 'ban' | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [timeoutDays, setTimeoutDays] = useState(7);

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
          email,
          department,
          year
        `);

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch moderation data
      const { data: moderationData } = await supabase
        .from('user_moderation')
        .select('user_id, moderation_type, is_active, expires_at');

      // Combine users with their roles and moderation info
      const combinedUsers = profilesData.map((profile) => {
        const userRoles = rolesData?.filter((r) => r.user_id === profile.id) || [];
        const userModerations = moderationData?.filter((m) => m.user_id === profile.id && m.is_active) || [];
        
        const warningCount = userModerations.filter(m => m.moderation_type === 'warning').length;
        const isBanned = userModerations.some(m => m.moderation_type === 'ban');
        const isTimedOut = userModerations.some(m => 
          m.moderation_type === 'timeout' && 
          (!m.expires_at || new Date(m.expires_at) > new Date())
        );
        
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email || `User ID: ${profile.id.substring(0, 8)}...`,
          department: profile.department,
          year: profile.year,
          roles: userRoles,
          warningCount,
          isBanned,
          isTimedOut,
        };
      });

      setUsers(combinedUsers);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (actionType === 'promote') {
        const { error } = await supabase.from('user_roles').insert({
          user_id: selectedUser.id,
          role: 'admin',
        });
        if (error) throw error;
        toast.success(`${selectedUser.full_name} promoted to Admin`);
      } else if (actionType === 'demote') {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('role', 'admin');
        if (error) throw error;
        toast.success(`${selectedUser.full_name} demoted to Student`);
      } else if (actionType === 'warning' || actionType === 'timeout' || actionType === 'ban') {
        if (!moderationReason.trim()) {
          toast.error('Please provide a reason for this action');
          return;
        }

        const expiresAt = actionType === 'timeout' 
          ? new Date(Date.now() + timeoutDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { error } = await supabase.from('user_moderation').insert({
          user_id: selectedUser.id,
          moderation_type: actionType,
          reason: moderationReason,
          issued_by: user?.id,
          expires_at: expiresAt,
          is_active: true,
        });
        
        if (error) throw error;
        
        const actionLabels = { warning: 'Warning issued', timeout: 'Timeout applied', ban: 'User banned' };
        toast.success(actionLabels[actionType]);
      }

      setModerationReason('');
      setTimeoutDays(7);
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
            <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-850 text-xs text-gray-500 font-mono">
              <div>NAME</div>
              <div>EMAIL</div>
              <div>DEPT</div>
              <div>ROLE / STATUS</div>
              <div>WARNINGS</div>
              <div className="text-right">ACTIONS</div>
            </div>

            {users.map((user) => {
              const isAdmin = isUserAdmin(user);
              const isSuperAdmin = user.roles.some((r) => r.role === 'super_admin');

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-6 gap-4 p-4 border-b border-gray-850 hover:bg-gray-950 transition-colors items-center"
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-400">{user.email}</div>
                  <div className="text-sm text-gray-400">{user.department || 'N/A'}</div>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={isAdmin ? 'default' : 'outline'}
                      className="text-xs font-mono w-fit"
                    >
                      {isSuperAdmin ? 'SUPER_ADMIN' : isAdmin ? 'ADMIN' : 'STUDENT'}
                    </Badge>
                    {user.isBanned && (
                      <Badge variant="destructive" className="text-xs w-fit">
                        <Ban className="w-3 h-3 mr-1" />
                        BANNED
                      </Badge>
                    )}
                    {user.isTimedOut && (
                      <Badge variant="outline" className="text-xs w-fit border-yellow-600 text-yellow-600">
                        <Clock className="w-3 h-3 mr-1" />
                        TIMEOUT
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {user.warningCount && user.warningCount > 0 ? (
                      <Badge variant="outline" className="text-xs border-orange-600 text-orange-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {user.warningCount}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-600">None</span>
                    )}
                  </div>
                  <div className="flex gap-1 justify-end flex-wrap">
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
                            className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-7"
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
                            className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-7"
                          >
                            <ShieldX className="w-3 h-3 mr-1" />
                            DEMOTE
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType('warning');
                          }}
                          size="sm"
                          variant="outline"
                          className="border-gray-850 text-orange-400 hover:text-orange-300 hover:border-orange-400 text-xs h-7"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          WARN
                        </Button>
                        {!user.isTimedOut && (
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('timeout');
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-850 text-yellow-400 hover:text-yellow-300 hover:border-yellow-400 text-xs h-7"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            TIMEOUT
                          </Button>
                        )}
                        {!user.isBanned && (
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('ban');
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-850 text-red-400 hover:text-red-300 hover:border-red-400 text-xs h-7"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            BAN
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

      <AlertDialog open={!!selectedUser && !!actionType} onOpenChange={() => {
        setSelectedUser(null);
        setModerationReason('');
        setTimeoutDays(7);
      }}>
        <AlertDialogContent className="bg-black border border-gray-850">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">
              {actionType === 'promote' && 'Promote to Admin'}
              {actionType === 'demote' && 'Demote to Student'}
              {actionType === 'warning' && 'Issue Warning'}
              {actionType === 'timeout' && 'Timeout User'}
              {actionType === 'ban' && 'Ban User'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {actionType === 'promote' && `Grant admin privileges to ${selectedUser?.full_name}? They will be able to manage complaints and moderate content.`}
              {actionType === 'demote' && `Remove admin privileges from ${selectedUser?.full_name}? They will return to student access only.`}
              {actionType === 'warning' && `Issue a formal warning to ${selectedUser?.full_name}. This will be recorded in their moderation history.`}
              {actionType === 'timeout' && `Temporarily restrict ${selectedUser?.full_name}'s access. They will not be able to submit complaints during this period.`}
              {actionType === 'ban' && `Permanently ban ${selectedUser?.full_name} from the platform. This action should only be used for serious violations.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(actionType === 'warning' || actionType === 'timeout' || actionType === 'ban') && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="moderation-reason" className="text-xs tracking-wider text-gray-400">
                  REASON *
                </Label>
                <Textarea
                  id="moderation-reason"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Provide a clear reason for this action..."
                  className="bg-transparent border-gray-850 focus:border-white resize-none"
                  rows={3}
                />
              </div>

              {actionType === 'timeout' && (
                <div className="space-y-2">
                  <Label htmlFor="timeout-days" className="text-xs tracking-wider text-gray-400">
                    DURATION (DAYS)
                  </Label>
                  <Input
                    id="timeout-days"
                    type="number"
                    min="1"
                    max="365"
                    value={timeoutDays}
                    onChange={(e) => setTimeoutDays(parseInt(e.target.value) || 7)}
                    className="bg-transparent border-gray-850 focus:border-white"
                  />
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-gray-850"
              onClick={() => {
                setModerationReason('');
                setTimeoutDays(7);
              }}
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={(actionType === 'warning' || actionType === 'timeout' || actionType === 'ban') && !moderationReason.trim()}
              className={`${
                actionType === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                actionType === 'timeout' ? 'bg-yellow-600 hover:bg-yellow-700' :
                actionType === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-white text-black hover:bg-gray-200'
              }`}
            >
              CONFIRM
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
