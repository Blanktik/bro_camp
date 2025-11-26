import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Phone, PhoneMissed, Download, Moon, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CallInterface } from '@/components/CallInterface';

interface Call {
  id: string;
  student_id: string;
  title: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  has_video: boolean;
  has_screen_share: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminCalls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [dndMode, setDndMode] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallTitle, setActiveCallTitle] = useState('');
  const [activeCallStudent, setActiveCallStudent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
    fetchDndStatus();
    setupRealtimeSubscription();
  }, []);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const callsWithProfiles = await Promise.all(
        (data || []).map(async (call) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', call.student_id)
            .single();

          return {
            ...call,
            profiles: profile || undefined,
          };
        })
      );

      setCalls(callsWithProfiles);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load calls');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDndStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_settings')
        .select('dnd_mode')
        .eq('admin_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setDndMode(data.dnd_mode);
      }
    } catch (error) {
      console.error('Error fetching DND status:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          const newCall = payload.new as Call;
          
          // Fetch student profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newCall.student_id)
            .single();

          const callWithProfile = {
            ...newCall,
            profiles: profile || undefined,
          };

          setCalls((prev) => [callWithProfile, ...prev]);

          // Check if in DND mode
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: settings } = await supabase
            .from('admin_settings')
            .select('dnd_mode')
            .eq('admin_id', user.id)
            .single();

          if (!settings?.dnd_mode) {
            toast(`Incoming call from ${profile?.full_name || 'Student'}`, {
              description: newCall.title,
              action: {
                label: 'Answer',
                onClick: () => handleAnswerCall(newCall.id, newCall.title, profile?.full_name || 'Student'),
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
        },
        (payload) => {
          setCalls((prev) =>
            prev.map((call) =>
              call.id === payload.new.id ? { ...call, ...(payload.new as Call) } : call
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleDndMode = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          admin_id: user.id,
          dnd_mode: enabled,
        });

      if (error) throw error;

      setDndMode(enabled);
      toast.success(enabled ? 'DND mode enabled' : 'DND mode disabled');
    } catch (error) {
      console.error('Error toggling DND:', error);
      toast.error('Failed to update DND mode');
    }
  };

  const handleAnswerCall = async (callId: string, title: string, studentName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('calls')
        .update({
          admin_id: user.id,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (error) throw error;

      setActiveCallId(callId);
      setActiveCallTitle(title);
      setActiveCallStudent(studentName);
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
    }
  };

  const handleEndCall = async () => {
    if (!activeCallId) return;

    try {
      const call = calls.find((c) => c.id === activeCallId);
      const duration = call?.started_at
        ? Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000)
        : 0;

      const { error } = await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration,
        })
        .eq('id', activeCallId);

      if (error) throw error;

      setActiveCallId(null);
      setActiveCallTitle('');
      setActiveCallStudent('');
      toast.success('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleCallBack = async (callId: string, title: string, studentName: string) => {
    await handleAnswerCall(callId, title, studentName);
  };

  const downloadCallReport = async () => {
    const completedCalls = calls.filter((c) => c.status === 'completed');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Call Report - BROCAMP</title>
        <style>
          body { font-family: monospace; background: black; color: white; padding: 40px; }
          h1 { border-bottom: 2px solid white; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid white; padding: 12px; text-align: left; }
          th { background: white; color: black; }
          .missed { color: #ef4444; }
        </style>
      </head>
      <body>
        <h1><span style="background: white; color: black; padding: 4px;">BRO</span>CAMP - Call Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Title</th>
              <th>Duration</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            ${completedCalls.map((call) => `
              <tr>
                <td>${new Date(call.created_at).toLocaleString()}</td>
                <td>${call.profiles?.full_name || 'Unknown'} (${call.profiles?.email || 'N/A'})</td>
                <td>${call.title}</td>
                <td>${call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'N/A'}</td>
                <td>
                  ${call.has_video ? 'Video' : ''} 
                  ${call.has_screen_share ? 'Screen Share' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report downloaded');
  };

  if (activeCallId) {
    return (
      <CallInterface
        callId={activeCallId}
        isInitiator={false}
        callTitle={activeCallTitle}
        participantName={activeCallStudent}
        onEndCall={handleEndCall}
        showVideoControls={false}
      />
    );
  }

  const pendingCalls = calls.filter((c) => c.status === 'pending');
  const missedCalls = calls.filter((c) => c.status === 'missed');
  const completedCalls = calls.filter((c) => c.status === 'completed');

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      <div className="border-b border-gray-850 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold tracking-tighter">
                <span className="bg-white text-black px-3">CALL</span> MANAGEMENT
              </h1>
              <p className="text-gray-400 mt-1">Manage student calls and support</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Label htmlFor="dnd-mode" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                DND Mode
              </Label>
              <Switch
                id="dnd-mode"
                checked={dndMode}
                onCheckedChange={toggleDndMode}
              />
            </div>

            {completedCalls.length > 0 && (
              <Button
                onClick={downloadCallReport}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="border border-gray-850">
            <TabsTrigger value="pending" className="gap-2">
              <Phone className="h-4 w-4" />
              Pending ({pendingCalls.length})
            </TabsTrigger>
            <TabsTrigger value="missed" className="gap-2">
              <PhoneMissed className="h-4 w-4" />
              Missed ({missedCalls.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({completedCalls.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingCalls.length === 0 ? (
              <Card className="p-12 text-center border-gray-850">
                <p className="text-gray-400">No pending calls</p>
              </Card>
            ) : (
              pendingCalls.map((call) => (
                <Card key={call.id} className="p-6 border-gray-850 animate-pulse-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{call.title}</h3>
                      <p className="text-sm text-gray-400">
                        {call.profiles?.full_name || 'Unknown Student'} • {call.profiles?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleAnswerCall(
                          call.id,
                          call.title,
                          call.profiles?.full_name || 'Student'
                        )
                      }
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Answer
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="missed" className="space-y-4">
            {missedCalls.length === 0 ? (
              <Card className="p-12 text-center border-gray-850">
                <p className="text-gray-400">No missed calls</p>
              </Card>
            ) : (
              missedCalls.map((call) => (
                <Card key={call.id} className="p-6 border-gray-850">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{call.title}</h3>
                        <Badge variant="destructive" className="bg-red-600">
                          MISSED
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {call.profiles?.full_name || 'Unknown Student'} • {call.profiles?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleCallBack(
                          call.id,
                          call.title,
                          call.profiles?.full_name || 'Student'
                        )
                      }
                      variant="outline"
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call Back
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {completedCalls.length === 0 ? (
              <Card className="p-12 text-center border-gray-850">
                <p className="text-gray-400">No call history</p>
              </Card>
            ) : (
              completedCalls.map((call) => (
                <Card key={call.id} className="p-6 border-gray-850">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{call.title}</h3>
                      <Badge variant="secondary">
                        {call.duration
                          ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                          : 'N/A'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      {call.profiles?.full_name || 'Unknown Student'} • {call.profiles?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(call.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {call.has_video && (
                        <Badge variant="outline" className="text-xs">
                          Video
                        </Badge>
                      )}
                      {call.has_screen_share && (
                        <Badge variant="outline" className="text-xs">
                          Screen Share
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
