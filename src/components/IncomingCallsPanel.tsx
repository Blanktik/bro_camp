import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Call {
  id: string;
  student_name: string;
  student_email: string;
  call_title: string;
  status: string;
  created_at: string;
}

export function IncomingCallsPanel() {
  const [pendingCalls, setPendingCalls] = useState<Call[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPendingCalls();

    // Subscribe to new calls
    const channel = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls'
        },
        (payload) => {
          const newCall = payload.new as Call;
          setPendingCalls(prev => [newCall, ...prev]);
          
          toast({
            title: "📞 New Call Request",
            description: `${newCall.student_name} is calling about: ${newCall.call_title}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls'
        },
        () => {
          fetchPendingCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCalls = async () => {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPendingCalls(data || []);
  };

  const handleAttendCall = async (callId: string) => {
    const { error } = await supabase
      .from('calls')
      .update({
        status: 'active',
        attended_by: user?.id,
        attended_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to attend call",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Call Attended",
        description: "You are now attending this call",
      });
    }
  };

  const handleMarkMissed = async (callId: string) => {
    const { error } = await supabase
      .from('calls')
      .update({
        status: 'missed',
        completed_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (!error) {
      toast({
        title: "Call Marked as Missed",
        description: "Student will be notified to leave a voice note",
      });
    }
  };

  if (pendingCalls.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {pendingCalls.map((call) => (
        <Card key={call.id} className="p-4 bg-background/95 backdrop-blur border-primary/20 shadow-lg">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary animate-pulse" />
                  <span className="font-semibold">{call.student_name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{call.student_email}</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium">{call.call_title}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleAttendCall(call.id)}
              >
                <Phone className="h-3 w-3 mr-1" />
                Attend
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleMarkMissed(call.id)}
              >
                <PhoneOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
