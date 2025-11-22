import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Phone, Download, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInSeconds, format } from 'date-fns';

interface Call {
  id: string;
  student_name: string;
  student_email: string;
  call_title: string;
  status: string;
  created_at: string;
  attended_at: string | null;
  completed_at: string | null;
  voice_note_url: string | null;
  attended_by: string | null;
}

export default function AdminCallHistory() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'missed'>('all');

  useEffect(() => {
    fetchCalls();

    // Subscribe to call updates
    const channel = supabase
      .channel('call-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls'
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  const fetchCalls = async () => {
    try {
      let query = supabase
        .from('calls')
        .select('*')
        .in('status', ['completed', 'missed'])
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (attendedAt: string | null, completedAt: string | null) => {
    if (!attendedAt || !completedAt) return 'N/A';
    
    const seconds = differenceInSeconds(new Date(completedAt), new Date(attendedAt));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = (url: string, callId: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_recording_${callId}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-white text-black">COMPLETED</Badge>;
      case 'missed':
        return <Badge variant="outline" className="border-gray-600 text-gray-400">MISSED</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Call History</h1>
            <p className="text-gray-400 text-sm">{calls.length} total calls</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className={filterStatus === 'all' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
            >
              ALL
            </Button>
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('completed')}
              className={filterStatus === 'completed' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
            >
              COMPLETED
            </Button>
            <Button
              variant={filterStatus === 'missed' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('missed')}
              className={filterStatus === 'missed' ? 'bg-white text-black' : 'border-gray-850 text-gray-400'}
            >
              MISSED
            </Button>
          </div>

          {/* Calls List */}
          {calls.length === 0 ? (
            <Card className="p-12 text-center border-gray-850">
              <Phone className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500">No call history yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <Card key={call.id} className="p-6 border-gray-850 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{call.call_title}</h3>
                        {getStatusBadge(call.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="font-medium">{call.student_name}</span>
                        <span>•</span>
                        <span>{call.student_email}</span>
                      </div>
                    </div>

                    {call.voice_note_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(call.voice_note_url!, call.id)}
                        className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        DOWNLOAD
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-850">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 tracking-wider">CALL DURATION</p>
                      <p className="text-sm font-mono">
                        {call.status === 'completed' ? calculateDuration(call.attended_at, call.completed_at) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 tracking-wider">INITIATED</p>
                      <p className="text-sm">
                        {format(new Date(call.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 tracking-wider">
                        {call.status === 'completed' ? 'COMPLETED' : 'STATUS'}
                      </p>
                      <p className="text-sm">
                        {call.completed_at
                          ? formatDistanceToNow(new Date(call.completed_at), { addSuffix: true })
                          : call.status === 'missed'
                          ? 'Not answered'
                          : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {call.status === 'missed' && (
                    <div className="mt-4 pt-4 border-t border-gray-850">
                      <p className="text-xs text-gray-500">
                        This call was not attended and marked as missed
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
