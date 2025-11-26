import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Call {
  id: string;
  title: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  admin_id: string | null;
}

export default function StudentCallHistory() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, [user]);

  const fetchCallHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-900/20 text-green-400 border-green-800',
      missed: 'bg-red-900/20 text-red-400 border-red-800',
      pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
      active: 'bg-blue-900/20 text-blue-400 border-blue-800',
    };

    return (
      <Badge className={`${variants[status] || ''} border`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen animate-fade-in">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center animate-slide-in-left">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-white text-black px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <span className="text-xs text-gray-500 tracking-wider">CALL HISTORY</span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="border-gray-850 text-gray-400 hover:text-white hover:border-white hover-scale"
        >
          SIGN OUT
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/student')}
                variant="outline"
                className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h2 className="text-3xl font-bold tracking-tight">Call History</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading call history...</div>
          ) : calls.length === 0 ? (
            <div className="border border-gray-850 p-12 text-center animate-fade-in-up animate-delay-200">
              <Phone className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500">No call history yet</p>
            </div>
          ) : (
            <div className="border border-gray-850 animate-fade-in-up animate-delay-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-850 hover:bg-transparent">
                    <TableHead className="text-gray-400">TITLE</TableHead>
                    <TableHead className="text-gray-400">STATUS</TableHead>
                    <TableHead className="text-gray-400">DATE</TableHead>
                    <TableHead className="text-gray-400">DURATION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call, index) => (
                    <TableRow 
                      key={call.id} 
                      className="border-gray-850 hover:bg-gray-900/50 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          {call.title}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(call.created_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Clock className="w-3 h-3" />
                          {formatDuration(call.duration)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
