import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ArrowLeft, UserX, Bell, CheckCircle2, Download, ArrowUpCircle, HelpCircle, Copy, Volume2, Search } from 'lucide-react';
import { VoicePlayer } from '@/components/VoicePlayer';

interface Complaint {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: string;
  admin_response: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  media_urls: string[] | null;
  viewed_at: string | null;
  edited_at: string | null;
  voice_note_url: string | null;
  admin_id: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  admin_profile?: { full_name: string; email: string } | null;
}

const quickMacros = [
  { label: 'NOTED', icon: Bell, response: 'We are working on this. Will update you soon.', status: 'in_progress' },
  { label: 'NEED INFO', icon: HelpCircle, response: 'We need more information to address this. Please provide additional details.', status: 'in_progress' },
  { label: 'ESCALATED', icon: ArrowUpCircle, response: 'This has been escalated to senior management for review.', status: 'in_progress' },
  { label: 'DUPLICATE', icon: Copy, response: 'This is a duplicate of an existing complaint. We are already working on it.', status: 'resolved' },
  { label: 'DONE', icon: CheckCircle2, response: 'Issue has been resolved. Thank you for bringing this to our attention.', status: 'resolved' },
];

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'in_progress' | 'resolved'>('resolved');
  const [editingInProgress, setEditingInProgress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'voice_notes'>('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    // Filter complaints based on search query and status
    let filtered = complaints;

    // Apply status filter
    if (statusFilter === 'voice_notes') {
      filtered = filtered.filter(c => c.voice_note_url);
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.profiles?.full_name.toLowerCase().includes(query) ||
        c.profiles?.email.toLowerCase().includes(query)
      );
    }

    setFilteredComplaints(filtered);
  }, [complaints, searchQuery, statusFilter]);

  const fetchComplaints = async () => {
    try {
      const { data: complaintsData, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data separately for non-anonymous complaints
      const userIds = complaintsData
        .filter(c => c.user_id)
        .map(c => c.user_id);

      const adminIds = complaintsData
        .filter(c => c.admin_id)
        .map(c => c.admin_id);

      const allProfileIds = [...new Set([...userIds, ...adminIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allProfileIds);

      // Merge data and hide identity for anonymous complaints
      const complaints = complaintsData.map(complaint => ({
        ...complaint,
        profiles: complaint.is_anonymous
          ? { full_name: 'Anonymous', email: '' }
          : (profilesData?.find(p => p.id === complaint.user_id) || null),
        admin_profile: complaint.admin_id 
          ? profilesData?.find(p => p.id === complaint.admin_id) 
          : null
      }));

      setComplaints(complaints);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (complaintId: string, currentViewedAt: string | null) => {
    if (currentViewedAt) return; // Already viewed
    
    try {
      await supabase
        .from('complaints')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', complaintId);
    } catch (error) {
      console.error('Error marking complaint as viewed:', error);
    }
  };

  const handleQuickMacro = async (complaintId: string, macroResponse: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        admin_response: macroResponse,
        status: status,
        admin_id: user?.id,
        responded_at: new Date().toISOString(),
      };
      
      // Add resolved_at timestamp if status is resolved
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast.success('Quick response sent');
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRespond = async (complaintId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        admin_response: response,
        status: selectedStatus,
        admin_id: user?.id,
        responded_at: new Date().toISOString(),
      };
      
      // Add resolved_at timestamp if status is resolved
      if (selectedStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast.success('Response submitted');
      setSelectedComplaint(null);
      setResponse('');
      setSelectedStatus('resolved');
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDownloadReport = () => {
    try {
      // Create HTML content
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complaints Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000; 
      color: #fff; 
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 48px; 
      font-weight: bold; 
      margin-bottom: 10px;
      letter-spacing: -1px;
    }
    .brand { background: #fff; color: #000; padding: 0 8px; display: inline-block; }
    .meta { 
      color: #666; 
      font-size: 14px; 
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #222;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: #111;
      border: 1px solid #222;
      padding: 20px;
    }
    .stat-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .stat-value { font-size: 32px; font-weight: bold; margin-top: 8px; }
    .complaint {
      background: #111;
      border: 1px solid #222;
      padding: 30px;
      margin-bottom: 20px;
    }
    .complaint-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #222;
    }
    .complaint-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
    .complaint-meta { color: #666; font-size: 14px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
      border: 1px solid #222;
    }
    .badge-pending { background: #222; color: #999; }
    .badge-resolved { background: #fff; color: #000; }
    .badge-in_progress { background: #333; color: #fff; }
    .complaint-content { margin-bottom: 20px; color: #ccc; }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin: 20px 0;
    }
    .media-item {
      aspect-ratio: 16/9;
      background: #222;
      border: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
    }
    .voice-note {
      background: #0a0a0a;
      border: 1px solid #222;
      padding: 15px;
      margin: 20px 0;
    }
    .voice-note-label {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .admin-response {
      background: #0a0a0a;
      border: 1px solid #222;
      padding: 20px;
      margin-top: 20px;
    }
    .response-label {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .edited-badge {
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-left: 12px;
    }
    audio { width: 100%; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="brand">BRO</span>CAMP Complaints Report</h1>
    <div class="meta">
      Generated on ${new Date().toLocaleString()} | Total Complaints: ${filteredComplaints.length}
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Pending</div>
        <div class="stat-value">${filteredComplaints.filter(c => c.status === 'pending').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">In Progress</div>
        <div class="stat-value">${filteredComplaints.filter(c => c.status === 'in_progress').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Resolved</div>
        <div class="stat-value">${filteredComplaints.filter(c => c.status === 'resolved').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">With Voice Notes</div>
        <div class="stat-value">${filteredComplaints.filter(c => c.voice_note_url).length}</div>
      </div>
    </div>

    ${filteredComplaints.map(complaint => `
      <div class="complaint">
        <div class="complaint-header">
          <div>
            <div class="complaint-title">
              ${complaint.title}
              ${complaint.edited_at ? '<span class="edited-badge">EDITED</span>' : ''}
            </div>
            <div class="complaint-meta">
              ${complaint.is_anonymous ? '👤 Anonymous' : `${complaint.profiles?.full_name || 'Unknown User'}${complaint.profiles?.email ? ` • ${complaint.profiles.email}` : ''}`}
              • ${new Date(complaint.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <span class="badge badge-${complaint.status}">${complaint.status.toUpperCase().replace('_', ' ')}</span>
        </div>

        <div class="complaint-content">
          ${complaint.description}
        </div>

        ${complaint.media_urls && complaint.media_urls.length > 0 ? `
          <div class="media-grid">
            ${complaint.media_urls.map(url => `
              <div class="media-item">
                ${url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') 
                  ? `<video src="${url}" controls style="width: 100%; height: 100%; object-fit: cover;"></video>` 
                  : `<img src="${url}" alt="Complaint media" style="width: 100%; height: 100%; object-fit: cover;" />`
                }
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${complaint.voice_note_url ? `
          <div class="voice-note">
            <div class="voice-note-label">🎤 Voice Note</div>
            <audio controls src="${complaint.voice_note_url}"></audio>
          </div>
        ` : ''}

        ${complaint.admin_response ? `
          <div class="admin-response">
            <div class="response-label">Admin Response</div>
            <div>${complaint.admin_response}</div>
            ${complaint.admin_profile ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #222; color: #666; font-size: 12px;">
                <strong>Responded by:</strong> ${complaint.admin_profile.full_name} (${complaint.admin_profile.email})
                ${complaint.responded_at ? `<br><strong>Responded at:</strong> ${new Date(complaint.responded_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
      `;

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      
      link.setAttribute('href', url);
      link.setAttribute('download', `complaints-report-${date}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center">
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
              <h1 className="text-4xl font-bold mb-2 tracking-tight">Complaint Management</h1>
              <p className="text-gray-400 text-sm">{filteredComplaints.length} complaints {statusFilter !== 'all' ? `(${statusFilter.replace('_', ' ')})` : ''}</p>
            </div>
            <Button
              onClick={handleDownloadReport}
              variant="outline"
              className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
              disabled={filteredComplaints.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              DOWNLOAD REPORT
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by title, description, or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-gray-850 focus:border-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
                className={statusFilter === 'all' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
              >
                ALL ({complaints.length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                size="sm"
                className={statusFilter === 'pending' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
              >
                PENDING ({complaints.filter(c => c.status === 'pending').length})
              </Button>
              <Button
                variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('in_progress')}
                size="sm"
                className={statusFilter === 'in_progress' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
              >
                IN PROGRESS ({complaints.filter(c => c.status === 'in_progress').length})
              </Button>
              <Button
                variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('resolved')}
                size="sm"
                className={statusFilter === 'resolved' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
              >
                RESOLVED ({complaints.filter(c => c.status === 'resolved').length})
              </Button>
              <Button
                variant={statusFilter === 'voice_notes' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('voice_notes')}
                size="sm"
                className={statusFilter === 'voice_notes' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
              >
                VOICE NOTES ({complaints.filter(c => c.voice_note_url).length})
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="border border-gray-850 p-12 text-center">
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No complaints found matching your filters' 
                    : 'No complaints submitted yet'}
                </p>
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="border border-gray-850 p-6 hover:border-gray-700 transition-colors"
                  onMouseEnter={() => markAsViewed(complaint.id, complaint.viewed_at)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{complaint.title}</h3>
                        <Badge
                          className={`text-xs tracking-wider ${
                            complaint.status === 'pending'
                              ? 'bg-gray-800 text-gray-300'
                              : 'bg-white text-black'
                          }`}
                        >
                          {complaint.status.toUpperCase()}
                        </Badge>
                        {complaint.edited_at && (
                          <span className="text-xs text-gray-500 tracking-wider">EDITED</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          {complaint.is_anonymous && <UserX className="w-4 h-4" />}
                          {complaint.is_anonymous
                            ? 'Anonymous'
                            : (complaint.profiles?.full_name || 'Unknown User')}
                        </span>
                        {!complaint.is_anonymous && complaint.profiles?.email && (
                          <>
                            <span>•</span>
                            <span>{complaint.profiles.email}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(complaint.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                    {complaint.description}
                  </p>

                  {complaint.media_urls && complaint.media_urls.length > 0 && (
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {complaint.media_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-gray-850 hover:border-gray-700 transition-colors overflow-hidden aspect-video"
                        >
                          {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                          ) : (
                            <img src={url} alt="Complaint media" className="w-full h-full object-cover" />
                          )}
                        </a>
                      ))}
                    </div>
                  )}

                  {complaint.voice_note_url && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Voice Note</span>
                      </div>
                      <VoicePlayer audioUrl={complaint.voice_note_url} />
                    </div>
                  )}

                  {complaint.status === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex gap-2 pb-4 border-b border-gray-850">
                        <span className="text-xs text-gray-500 tracking-wider">QUICK MACRO:</span>
                        <TooltipProvider>
                          {quickMacros.map((macro) => (
                            <Tooltip key={macro.label}>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickMacro(complaint.id, macro.response, macro.status)}
                                  className="border-gray-850 text-gray-400 hover:text-white hover:border-white h-7 px-3 text-xs"
                                >
                                  <macro.icon className="w-3 h-3 mr-1" />
                                  {macro.label}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 border-gray-850 text-gray-300 max-w-xs">
                                <p className="text-xs">{macro.response}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>

                      {selectedComplaint?.id === complaint.id ? (
                        <div className="space-y-3 pt-2">
                          <Textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Write a detailed response..."
                            className="bg-transparent border-gray-850 focus:border-white resize-none"
                            rows={4}
                          />
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-2 tracking-wider">SET STATUS:</p>
                              <RadioGroup
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value as 'in_progress' | 'resolved')}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="in_progress" id="in_progress" className="border-gray-850" />
                                  <Label htmlFor="in_progress" className="text-sm text-gray-400 cursor-pointer">
                                    IN PROGRESS
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="resolved" id="resolved" className="border-gray-850" />
                                  <Label htmlFor="resolved" className="text-sm text-gray-400 cursor-pointer">
                                    RESOLVED
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleRespond(complaint.id)}
                                className="bg-white text-black hover:bg-gray-200 text-xs h-8"
                                disabled={!response.trim()}
                              >
                                SUBMIT RESPONSE
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedComplaint(null);
                                  setResponse('');
                                  setSelectedStatus('resolved');
                                }}
                                variant="outline"
                                className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-8"
                              >
                                CANCEL
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setSelectedComplaint(complaint)}
                          variant="outline"
                          className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-8"
                        >
                          CUSTOM RESPONSE
                        </Button>
                  )}
                </div>
              )}

              {complaint.status === 'in_progress' && (
                <div className="pt-4 border-t border-gray-850">
                  {editingInProgress === complaint.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Update response or write a new one..."
                        className="bg-transparent border-gray-850 focus:border-white resize-none"
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            handleQuickMacro(complaint.id, response || complaint.admin_response || '', 'resolved');
                            setEditingInProgress(null);
                            setResponse('');
                          }}
                          className="bg-white text-black hover:bg-gray-200 text-xs h-8"
                          disabled={!response.trim() && !complaint.admin_response}
                        >
                          MARK AS RESOLVED
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingInProgress(null);
                            setResponse('');
                          }}
                          variant="outline"
                          className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-8"
                        >
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setEditingInProgress(complaint.id);
                        setResponse(complaint.admin_response || '');
                      }}
                      className="bg-white text-black hover:bg-gray-200 text-xs h-8"
                    >
                      MARK AS RESOLVED
                    </Button>
                  )}
                </div>
              )}

              {complaint.admin_response && (
                <div className="border-t border-gray-850 pt-4 mt-4">
                  <p className="text-xs text-gray-500 mb-2 tracking-wider">ADMIN RESPONSE</p>
                  <p className="text-sm text-gray-300">{complaint.admin_response}</p>
                </div>
              )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
