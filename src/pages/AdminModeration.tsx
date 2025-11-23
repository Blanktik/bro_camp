import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Shield, AlertTriangle, Flag, CheckCircle, Trash2, Eye, FileText, RefreshCw, X } from 'lucide-react';
import { VoicePlayer } from '@/components/VoicePlayer';

interface Complaint {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  moderation_notes: string | null;
  moderation_action: string | null;
  media_urls: string[] | null;
  voice_note_url: string | null;
  profiles: { full_name: string; email: string } | null;
  appeal_text: string | null;
  appeal_submitted_at: string | null;
  appeal_status: string | null;
  appeal_response: string | null;
  deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export default function AdminModeration() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'flagged' | 'archive'>('flagged');
  const [appealResponse, setAppealResponse] = useState('');
  const [respondingToAppeal, setRespondingToAppeal] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
    
    // Set up realtime subscription for complaints
    const channel = supabase
      .channel('moderation-complaints')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      
      // Fetch based on filter - archive shows deleted, others show non-deleted
      const query = supabase
        .from('complaints')
        .select('*');
      
      if (viewFilter === 'archive') {
        query.eq('deleted', true);
      } else {
        query.eq('deleted', false);
      }
      
      const { data: complaintsData, error } = await query
        .order('flagged', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched complaints:', complaintsData?.length, 'Flagged:', complaintsData?.filter(c => c.flagged).length);

      // Fetch profiles
      const userIds = complaintsData
        .filter(c => c.user_id)
        .map(c => c.user_id);

      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const complaintsWithProfiles = complaintsData.map(complaint => ({
        ...complaint,
        profiles: complaint.user_id ? profilesMap.get(complaint.user_id) || null : null,
      }));

      setComplaints(complaintsWithProfiles);
    } catch (error: any) {
      toast.error('Failed to fetch complaints');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagComplaint = async (complaint: Complaint) => {
    if (!flagReason.trim()) {
      toast.error('Please provide a reason for flagging');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('complaints')
        .update({
          flagged: true,
          flagged_reason: flagReason,
          flagged_at: new Date().toISOString(),
          flagged_by: user?.id,
        })
        .eq('id', complaint.id);

      if (error) throw error;

      toast.success('Complaint flagged for review');
      setFlagReason('');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error('Failed to flag complaint');
    }
  };

  const handleUnflagComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          flagged: false,
          flagged_reason: null,
          flagged_at: null,
          flagged_by: null,
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast.success('Complaint unflagged');
      fetchComplaints();
    } catch (error: any) {
      toast.error('Failed to unflag complaint');
    }
  };

  const handleModerationAction = async (complaintId: string, action: 'approve' | 'delete') => {
    try {
      if (action === 'delete') {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('complaints')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id,
          })
          .eq('id', complaintId);

        if (error) throw error;
        toast.success('Complaint moved to archive');
      } else {
        const { error } = await supabase
          .from('complaints')
          .update({
            flagged: false,
            moderation_action: 'approved',
            moderation_notes: moderationNotes || null,
          })
          .eq('id', complaintId);

        if (error) throw error;
        toast.success('Complaint approved');
      }

      setModerationNotes('');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error(`Failed to ${action} complaint`);
    }
  };

  const handleRestore = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', complaintId);

      if (error) throw error;
      toast.success('Complaint restored');
      fetchComplaints();
    } catch (error: any) {
      toast.error('Failed to restore complaint');
    }
  };

  const handlePermanentDelete = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;
      toast.success('Complaint permanently deleted');
      fetchComplaints();
    } catch (error: any) {
      toast.error('Failed to delete complaint');
    }
  };

  const handleAppealResponse = async (complaintId: string, decision: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        appeal_status: decision,
        appeal_reviewed_by: user?.id,
        appeal_reviewed_at: new Date().toISOString(),
        appeal_response: appealResponse.trim() || null,
      };

      // If appeal approved, unflag the complaint
      if (decision === 'approved') {
        updateData.flagged = false;
        updateData.flagged_reason = null;
        updateData.flagged_at = null;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast.success(`Appeal ${decision}`);
      setAppealResponse('');
      setRespondingToAppeal(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error('Failed to respond to appeal');
    }
  };

  const flaggedCount = complaints.filter(c => c.flagged && !c.deleted).length;
  const filteredComplaints = viewFilter === 'flagged' 
    ? complaints.filter(c => c.flagged)
    : viewFilter === 'archive'
    ? complaints
    : complaints;

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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">Moderation Center</h1>
              <p className="text-gray-400 text-sm">Review and manage flagged content</p>
            </div>
            <Button
              onClick={fetchComplaints}
              variant="outline"
              size="sm"
              className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-gray-850 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-gray-400" />
                <h3 className="text-sm tracking-wider text-gray-400">TOTAL COMPLAINTS</h3>
              </div>
              <p className="text-3xl font-bold mb-2">{complaints.length}</p>
              <p className="text-xs text-gray-500">All submissions</p>
            </div>

            <div className={`border p-6 ${flaggedCount > 0 ? 'border-white animate-border-glow' : 'border-gray-850'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Flag className="w-6 h-6 text-gray-400" />
                <h3 className="text-sm tracking-wider text-gray-400">FLAGGED CONTENT</h3>
              </div>
              <p className="text-3xl font-bold mb-2">{flaggedCount}</p>
              <p className="text-xs text-gray-500">{flaggedCount === 0 ? 'No content flagged' : 'Needs review'}</p>
            </div>

            <div className="border border-gray-850 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
                <h3 className="text-sm tracking-wider text-gray-400">PENDING REVIEWS</h3>
              </div>
              <p className="text-3xl font-bold mb-2">{flaggedCount}</p>
              <p className="text-xs text-gray-500">{flaggedCount === 0 ? 'All clear' : 'Requires action'}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 flex gap-2">
            <Button
              onClick={() => setViewFilter('flagged')}
              variant={viewFilter === 'flagged' ? 'default' : 'outline'}
              className="border-gray-850"
            >
              <Flag className="w-4 h-4 mr-2" />
              FLAGGED ONLY ({flaggedCount})
            </Button>
            <Button
              onClick={() => setViewFilter('all')}
              variant={viewFilter === 'all' ? 'default' : 'outline'}
              className="border-gray-850"
            >
              <Eye className="w-4 h-4 mr-2" />
              ALL COMPLAINTS
            </Button>
            <Button
              onClick={() => setViewFilter('archive')}
              variant={viewFilter === 'archive' ? 'default' : 'outline'}
              className="border-gray-850"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ARCHIVE ({complaints.length})
            </Button>
          </div>

          {/* Complaints List */}
          {filteredComplaints.length === 0 ? (
            <div className="border border-gray-850 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {viewFilter === 'flagged' ? 'No flagged complaints' : 
                 viewFilter === 'archive' ? 'No deleted complaints' : 'No complaints found'}
              </p>
              <p className="text-xs text-gray-600">
                {viewFilter === 'flagged' 
                  ? 'All content has been reviewed'
                  : viewFilter === 'archive'
                  ? 'Archive is empty'
                  : 'No complaints have been submitted yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((complaint) => (
                <div 
                  key={complaint.id} 
                  className={`border p-6 ${complaint.flagged ? 'border-white bg-gray-950' : 'border-gray-850'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{complaint.title}</h3>
                        {complaint.flagged && (
                          <Badge variant="destructive" className="text-xs">
                            <Flag className="w-3 h-3 mr-1" />
                            FLAGGED
                          </Badge>
                        )}
                        {complaint.is_anonymous && (
                          <Badge variant="outline" className="text-xs border-gray-700">
                            ANONYMOUS
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs border-gray-700">
                          {complaint.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{complaint.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {complaint.profiles ? complaint.profiles.full_name : 'Anonymous'}
                        </span>
                        <span>•</span>
                        <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                      </div>

                      {complaint.voice_note_url && (
                        <div className="mt-3">
                          <VoicePlayer audioUrl={complaint.voice_note_url} />
                        </div>
                      )}

                      {complaint.flagged && (
                        <div className="mt-3 p-3 bg-gray-900 border border-gray-800">
                          <p className="text-xs text-gray-400 mb-1">FLAG REASON:</p>
                          <p className="text-sm">{complaint.flagged_reason}</p>
                          {complaint.flagged_at && (
                            <p className="text-xs text-gray-600 mt-1">
                              Flagged on {new Date(complaint.flagged_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {complaint.moderation_notes && (
                        <div className="mt-3 p-3 bg-gray-900 border border-gray-800">
                          <p className="text-xs text-gray-400 mb-1">MODERATION NOTES:</p>
                          <p className="text-sm">{complaint.moderation_notes}</p>
                        </div>
                      )}

                      {/* Appeal Display */}
                      {complaint.appeal_text && (
                        <div className="mt-3 p-4 bg-yellow-950/20 border border-yellow-800 rounded">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${
                                complaint.appeal_status === 'pending' ? 'bg-yellow-600' :
                                complaint.appeal_status === 'approved' ? 'bg-green-600' :
                                'bg-red-700'
                              }`}>
                                APPEAL {complaint.appeal_status?.toUpperCase() || 'PENDING'}
                              </Badge>
                              {complaint.appeal_submitted_at && (
                                <span className="text-xs text-gray-500">
                                  {new Date(complaint.appeal_submitted_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-yellow-400 font-semibold mb-1">STUDENT'S APPEAL:</p>
                          <p className="text-sm text-yellow-100 mb-3">{complaint.appeal_text}</p>

                          {complaint.appeal_response && (
                            <div className="mt-3 pt-3 border-t border-yellow-800">
                              <p className="text-xs text-yellow-400 font-semibold mb-1">YOUR RESPONSE:</p>
                              <p className="text-sm text-yellow-100">{complaint.appeal_response}</p>
                            </div>
                          )}

                          {complaint.appeal_status === 'pending' && (
                            <div className="mt-3 pt-3 border-t border-yellow-800">
                              {respondingToAppeal === complaint.id ? (
                                <div className="space-y-3">
                                  <Label htmlFor={`appeal-response-${complaint.id}`} className="text-xs text-yellow-300">
                                    RESPONSE TO APPEAL (OPTIONAL)
                                  </Label>
                                  <Textarea
                                    id={`appeal-response-${complaint.id}`}
                                    value={appealResponse}
                                    onChange={(e) => setAppealResponse(e.target.value)}
                                    placeholder="Provide feedback on the appeal decision..."
                                    className="bg-yellow-950/20 border-yellow-700 text-white min-h-[80px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleAppealResponse(complaint.id, 'approved')}
                                      size="sm"
                                      className="bg-green-600 text-white hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      APPROVE APPEAL
                                    </Button>
                                    <Button
                                      onClick={() => handleAppealResponse(complaint.id, 'rejected')}
                                      size="sm"
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      REJECT APPEAL
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setRespondingToAppeal(null);
                                        setAppealResponse('');
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="border-yellow-700"
                                    >
                                      CANCEL
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setRespondingToAppeal(complaint.id)}
                                  variant="outline"
                                  size="sm"
                                  className="border-yellow-700 text-yellow-300 hover:bg-yellow-950/20"
                                >
                                  RESPOND TO APPEAL
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {viewFilter === 'archive' ? (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-green-700 text-white hover:bg-green-600"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              RESTORE
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-black border-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Complaint</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                This will restore the complaint from the archive.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700">CANCEL</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestore(complaint.id)}
                                className="bg-white text-black hover:bg-gray-200"
                              >
                                RESTORE
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                            >
                              <X className="w-3 h-3 mr-1" />
                              PERMANENTLY DELETE
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-black border-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                This will permanently remove this complaint. This action CANNOT be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700">CANCEL</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePermanentDelete(complaint.id)}
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                DELETE FOREVER
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <>
                        {complaint.flagged ? (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-700"
                                  onClick={() => setSelectedComplaint(complaint)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  APPROVE
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-black border-gray-850">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Complaint</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    This will remove the flag and mark the complaint as reviewed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="my-4">
                                  <Label htmlFor="notes" className="text-sm text-gray-400">
                                    Moderation Notes (Optional)
                                  </Label>
                                  <Textarea
                                    id="notes"
                                    value={moderationNotes}
                                    onChange={(e) => setModerationNotes(e.target.value)}
                                    placeholder="Add any notes about this decision..."
                                    className="mt-2 bg-gray-950 border-gray-850"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-gray-850">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerationAction(complaint.id, 'approve')}
                                    className="bg-white text-black hover:bg-gray-200"
                                  >
                                    Approve
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  DELETE
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-black border-gray-850">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    This will move the complaint to the archive for review before permanent deletion.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-gray-850">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerationAction(complaint.id, 'delete')}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                  >
                                    Move to Archive
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <Button
                              onClick={() => handleUnflagComplaint(complaint.id)}
                              variant="outline"
                              size="sm"
                              className="border-gray-700"
                            >
                              UNFLAG
                            </Button>
                          </>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-700"
                                onClick={() => setSelectedComplaint(complaint)}
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                FLAG FOR REVIEW
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-black border-gray-850">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Flag Complaint</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Mark this complaint for moderation review. Provide a reason below.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="my-4">
                                <Label htmlFor="reason" className="text-sm text-gray-400">
                                  Flag Reason *
                                </Label>
                                <Textarea
                                  id="reason"
                                  value={flagReason}
                                  onChange={(e) => setFlagReason(e.target.value)}
                                  placeholder="Why is this content being flagged? (e.g., inappropriate language, spam, harassment)"
                                  className="mt-2 bg-gray-950 border-gray-850"
                                  required
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel 
                                  className="border-gray-850"
                                  onClick={() => setFlagReason('')}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => complaint && handleFlagComplaint(complaint)}
                                  className="bg-white text-black hover:bg-gray-200"
                                >
                                  Flag Complaint
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}