import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, UserX, ThumbsUp, Eye, CheckCircle2 } from 'lucide-react';

interface Complaint {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: string;
  admin_response: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
}

const quickMacros = [
  { label: 'OK', icon: ThumbsUp, response: 'Acknowledged. We will look into this matter.' },
  { label: 'HMMM', icon: Eye, response: 'Investigating this issue. Will update you soon.' },
  { label: 'DONE', icon: CheckCircle2, response: 'Issue has been resolved. Thank you for bringing this to our attention.' },
];

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

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

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Merge data and hide identity for anonymous complaints
      const complaints = complaintsData.map(complaint => ({
        ...complaint,
        profiles: complaint.is_anonymous
          ? { full_name: 'Anonymous' }
          : (profilesData?.find(p => p.id === complaint.user_id) || null)
      }));

      setComplaints(complaints);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMacro = async (complaintId: string, macroResponse: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          admin_response: macroResponse,
          status: 'resolved',
        })
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
      const { error } = await supabase
        .from('complaints')
        .update({
          admin_response: response,
          status: 'resolved',
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast.success('Response submitted');
      setSelectedComplaint(null);
      setResponse('');
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
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
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Complaint Management</h1>
            <p className="text-gray-400 text-sm">{complaints.length} total complaints</p>
          </div>

          <div className="space-y-4">
            {complaints.length === 0 ? (
              <div className="border border-gray-850 p-12 text-center">
                <p className="text-gray-500">No complaints submitted yet</p>
              </div>
            ) : (
              complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="border border-gray-850 p-6 hover:border-gray-700 transition-colors"
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
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          {complaint.is_anonymous && <UserX className="w-4 h-4" />}
                          {complaint.is_anonymous
                            ? 'Anonymous'
                            : (complaint.profiles?.full_name || 'Unknown User')}
                        </span>
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

                  {complaint.status === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex gap-2 pb-4 border-b border-gray-850">
                        <span className="text-xs text-gray-500 tracking-wider">QUICK MACRO:</span>
                        {quickMacros.map((macro) => (
                          <Button
                            key={macro.label}
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickMacro(complaint.id, macro.response)}
                            className="border-gray-850 text-gray-400 hover:text-white hover:border-white h-7 px-3 text-xs"
                          >
                            <macro.icon className="w-3 h-3 mr-1" />
                            {macro.label}
                          </Button>
                        ))}
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
                          onClick={() => setSelectedComplaint(complaint)}
                          variant="outline"
                          className="border-gray-850 text-gray-400 hover:text-white hover:border-white text-xs h-8"
                        >
                          CUSTOM RESPONSE
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
