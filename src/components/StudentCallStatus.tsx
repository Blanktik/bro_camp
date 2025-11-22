import { useEffect, useState } from 'react';
import { Phone, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Call {
  id: string;
  call_title: string;
  status: string;
  created_at: string;
  attended_at: string | null;
  completed_at: string | null;
  voice_note_url: string | null;
}

export function StudentCallStatus() {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [recentCall, setRecentCall] = useState<Call | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchCalls();

    // Subscribe to call updates
    const channel = supabase
      .channel('student-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `student_id=eq.${user.id}`
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCalls = async () => {
    if (!user) return;

    // Get active call
    const { data: active } = await supabase
      .from('calls')
      .select('*')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    setActiveCall(active);

    // Get most recent completed call with recording
    if (!active) {
      const { data: recent } = await supabase
        .from('calls')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .not('voice_note_url', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setRecentCall(recent);
    }
  };

  const handleDownload = (url: string, callId: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_recording_${callId}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!activeCall && !recentCall) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {activeCall && (
        <Card className="p-4 bg-background/95 backdrop-blur border-primary/20 shadow-lg animate-fade-in">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-semibold">Call In Progress</span>
              <Badge variant="outline" className="ml-auto">
                RECORDING
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">{activeCall.call_title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Started {formatDistanceToNow(new Date(activeCall.attended_at || activeCall.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              Your call is being recorded and will be available for download once completed.
            </p>
          </div>
        </Card>
      )}

      {recentCall && !activeCall && (
        <Card className="p-4 bg-background/95 backdrop-blur border-primary/20 shadow-lg animate-fade-in">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Call Recording Available</span>
            </div>
            <div>
              <p className="text-sm">{recentCall.call_title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Completed {formatDistanceToNow(new Date(recentCall.completed_at!), { addSuffix: true })}
              </p>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => handleDownload(recentCall.voice_note_url!, recentCall.id)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download Recording
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
