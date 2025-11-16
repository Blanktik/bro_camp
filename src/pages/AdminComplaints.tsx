import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, UserX } from 'lucide-react';

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

      // Merge data
      const complaints = complaintsData.map(complaint => ({
        ...complaint,
        profiles: complaint.user_id
          ? profilesData?.find(p => p.id === complaint.user_id) || null
          : null
      }));

      setComplaints(complaints);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
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
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="border border-gray-850 p-6 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{complaint.title}</h3>
                      {complaint.is_anonymous && (
                        <Badge
                          variant="outline"
                          className="border-gray-700 text-gray-400 text-xs"
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          ANONYMOUS
                        </Badge>
                      )}
                      <Badge
                        variant={complaint.status === 'resolved' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {complaint.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">
                      {complaint.is_anonymous
                        ? 'Anonymous User'
                        : complaint.profiles?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-gray-300 mb-4">{complaint.description}</p>

                {complaint.admin_response && (
                  <div className="border-t border-gray-850 pt-4 mt-4">
                    <p className="text-xs text-gray-500 mb-2">ADMIN RESPONSE:</p>
                    <p className="text-sm text-gray-300">{complaint.admin_response}</p>
                  </div>
                )}

                {selectedComplaint?.id === complaint.id ? (
                  <div className="border-t border-gray-850 pt-4 mt-4 space-y-4">
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Write your response..."
                      className="bg-transparent border-gray-850 focus:border-white resize-none"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRespond(complaint.id)}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        SUBMIT RESPONSE
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedComplaint(null);
                          setResponse('');
                        }}
                        variant="outline"
                        className="border-gray-850"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </div>
                ) : (
                  complaint.status === 'pending' && (
                    <Button
                      onClick={() => setSelectedComplaint(complaint)}
                      variant="outline"
                      className="mt-4 border-gray-850 text-gray-400 hover:text-white hover:border-white"
                    >
                      RESPOND
                    </Button>
                  )
                )}
              </div>
            ))}

            {complaints.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No complaints submitted yet
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
