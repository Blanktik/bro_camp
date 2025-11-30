import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Flag, Search, AlertTriangle, CheckCircle, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DashboardGuide } from '@/components/DashboardGuide';

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
  deleted: boolean;
  profiles: { full_name: string; email: string } | null;
  voice_note_url: string | null;
  media_urls: string[] | null;
}

const guideSteps = [
  {
    title: 'Welcome to Moderation',
    description: 'This is where you review and manage flagged complaints. You can flag inappropriate content, unflag false positives, and permanently delete soft-deleted complaints.',
    icon: <AlertTriangle className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Flagging Complaints',
    description: 'Click the FLAG button on any complaint to mark it for review. You\'ll be asked to provide a reason for flagging. Flagged complaints are highlighted with a red border.',
    icon: <Flag className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Filter Views',
    description: 'Use the filter buttons to switch between viewing all complaints, only flagged ones, or deleted complaints waiting for permanent removal.',
    icon: <Eye className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Permanent Deletion',
    description: 'In the "Deleted" view, you can permanently remove complaints that students have soft-deleted. This action cannot be undone.',
    icon: <Trash2 className="w-8 h-8 text-foreground" />,
  },
];

export default function AdminModeration() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'flagged' | 'deleted'>('flagged');
  
  // Flag dialog
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteComplaintId, setDeleteComplaintId] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    let filtered = complaints;

    // Apply view filter
    if (viewFilter === 'flagged') {
      filtered = filtered.filter(c => c.flagged && !c.deleted);
    } else if (viewFilter === 'deleted') {
      filtered = filtered.filter(c => c.deleted);
    } else {
      filtered = filtered.filter(c => !c.deleted);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.profiles?.full_name.toLowerCase().includes(query)
      );
    }

    setFilteredComplaints(filtered);
  }, [complaints, searchQuery, viewFilter]);

  const fetchComplaints = async () => {
    try {
      const { data: complaintsData, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = complaintsData
        .filter(c => c.user_id)
        .map(c => c.user_id);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const complaints = complaintsData.map(complaint => ({
        ...complaint,
        profiles: complaint.is_anonymous
          ? { full_name: 'Anonymous', email: '' }
          : (profilesData?.find(p => p.id === complaint.user_id) || null),
      }));

      setComplaints(complaints);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagComplaint = async () => {
    if (!selectedComplaintId || !flagReason.trim()) {
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
        .eq('id', selectedComplaintId);

      if (error) throw error;

      toast.success('Complaint flagged for review');
      setShowFlagDialog(false);
      setFlagReason('');
      setSelectedComplaintId(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
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
      toast.error(error.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteComplaintId) return;

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', deleteComplaintId);

      if (error) throw error;

      toast.success('Complaint permanently deleted');
      setShowDeleteDialog(false);
      setDeleteComplaintId(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getFlaggedCount = () => complaints.filter(c => c.flagged && !c.deleted).length;
  const getDeletedCount = () => complaints.filter(c => c.deleted).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <DashboardGuide
        steps={guideSteps}
        storageKey="brocamp-moderation-guide-seen"
        dashboardName="Moderation"
      />

      <header className="border-b border-border p-4 flex justify-between items-center">
        <Button
          onClick={() => navigate('/admin')}
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Content Moderation</h1>
            <p className="text-muted-foreground text-sm">
              Review and manage flagged complaints
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-border focus:border-foreground"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={viewFilter === 'flagged' ? 'default' : 'outline'}
                onClick={() => setViewFilter('flagged')}
                size="sm"
                className={viewFilter === 'flagged' ? 'bg-foreground text-background' : 'border-border text-muted-foreground'}
              >
                <Flag className="w-3 h-3 mr-1" />
                FLAGGED ({getFlaggedCount()})
              </Button>
              <Button
                variant={viewFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setViewFilter('all')}
                size="sm"
                className={viewFilter === 'all' ? 'bg-foreground text-background' : 'border-border text-muted-foreground'}
              >
                ALL ({complaints.filter(c => !c.deleted).length})
              </Button>
              <Button
                variant={viewFilter === 'deleted' ? 'default' : 'outline'}
                onClick={() => setViewFilter('deleted')}
                size="sm"
                className={viewFilter === 'deleted' ? 'bg-foreground text-background' : 'border-border text-muted-foreground'}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                DELETED ({getDeletedCount()})
              </Button>
            </div>
          </div>

          {/* Complaints List */}
          <div className="space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="border border-border p-12 text-center">
                <p className="text-muted-foreground">
                  {viewFilter === 'flagged'
                    ? 'No flagged complaints'
                    : viewFilter === 'deleted'
                    ? 'No deleted complaints'
                    : 'No complaints found'}
                </p>
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className={`border p-6 transition-all duration-300 ${
                    complaint.flagged
                      ? 'border-red-600 animate-pulse-border-red'
                      : complaint.deleted
                      ? 'border-muted-foreground/30 opacity-70'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {complaint.flagged && (
                          <Badge className="bg-red-600 text-white text-xs tracking-wider">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            FLAGGED
                          </Badge>
                        )}
                        {complaint.deleted && (
                          <Badge className="bg-muted-foreground/30 text-muted-foreground text-xs tracking-wider">
                            SOFT DELETED
                          </Badge>
                        )}
                        <h3 className="font-bold text-lg">{complaint.title}</h3>
                        <Badge
                          className={`text-xs tracking-wider ${
                            complaint.status === 'pending'
                              ? 'bg-secondary text-muted-foreground'
                              : 'bg-foreground text-background'
                          }`}
                        >
                          {complaint.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {complaint.is_anonymous ? 'Anonymous' : complaint.profiles?.full_name || 'Unknown'}
                        {' • '}
                        {new Date(complaint.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {complaint.description}
                  </p>

                  {complaint.flagged && complaint.flagged_reason && (
                    <div className="mb-4 p-4 border border-red-600/50 bg-red-600/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-500 tracking-wider font-bold">FLAG REASON</span>
                      </div>
                      <p className="text-sm text-red-400">{complaint.flagged_reason}</p>
                      {complaint.flagged_at && (
                        <p className="text-xs text-red-500/60 mt-2">
                          Flagged on {new Date(complaint.flagged_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border">
                    {viewFilter === 'deleted' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeleteComplaintId(complaint.id);
                          setShowDeleteDialog(true);
                        }}
                        className="border-red-600 text-red-500 hover:bg-red-600 hover:text-white text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        DELETE PERMANENTLY
                      </Button>
                    ) : complaint.flagged ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnflagComplaint(complaint.id)}
                        className="border-border text-muted-foreground hover:text-foreground text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        UNFLAG
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedComplaintId(complaint.id);
                          setShowFlagDialog(true);
                        }}
                        className="border-border text-muted-foreground hover:border-red-600 hover:text-red-500 text-xs"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        FLAG
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Flag Complaint</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide a reason for flagging this complaint for moderation review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Enter reason for flagging..."
            className="bg-transparent border-border focus:border-foreground"
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFlagDialog(false);
                setFlagReason('');
                setSelectedComplaintId(null);
              }}
              className="border-border text-muted-foreground"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleFlagComplaint}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!flagReason.trim()}
            >
              FLAG COMPLAINT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Permanent Delete</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. The complaint will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteComplaintId(null);
              }}
              className="border-border text-muted-foreground"
            >
              CANCEL
            </Button>
            <Button
              onClick={handlePermanentDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              DELETE PERMANENTLY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
