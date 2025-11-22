import { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CallModeProps {
  callId: string;
  studentName: string;
  studentEmail: string;
  callTitle: string;
  onEndCall: () => void;
}

export function CallMode({ callId, studentName, studentEmail, callTitle, onEndCall }: CallModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Call is being recorded",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording",
        variant: "destructive",
      });
    }
  };

  const uploadRecording = async (audioBlob: Blob) => {
    try {
      const fileName = `call_${callId}_${Date.now()}.webm`;
      const filePath = `recordings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('complaint-media')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('complaint-media')
        .getPublicUrl(filePath);

      // Update call with recording URL
      await supabase
        .from('calls')
        .update({ voice_note_url: publicUrl })
        .eq('id', callId);

      // Auto-download for admin
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Recording Saved",
        description: "Call recording has been saved and downloaded",
      });
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Upload Error",
        description: "Could not save recording",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    await supabase
      .from('calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', callId);

    toast({
      title: "Call Ended",
      description: "Recording has been saved",
    });

    onEndCall();
  };

  const toggleMute = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      const audioTracks = mediaRecorderRef.current.stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-fade-in">
      <Card className="w-full max-w-2xl p-8 bg-background border-primary/20">
        <div className="space-y-6">
          {/* Call Status */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Phone className="h-6 w-6 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground uppercase tracking-wider">CALL IN PROGRESS</span>
            </div>
            <h2 className="text-3xl font-bold">{studentName}</h2>
            <p className="text-sm text-muted-foreground">{studentEmail}</p>
            <p className="text-lg font-medium border border-border px-4 py-2 inline-block">{callTitle}</p>
          </div>

          {/* Call Timer */}
          <div className="text-center">
            <div className="text-5xl font-mono font-bold tracking-tight">
              {formatTime(callDuration)}
            </div>
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">RECORDING</span>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={toggleMute}
              className={isMuted ? 'border-primary text-primary' : ''}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEndCall}
              className="gap-2"
            >
              <PhoneOff className="h-5 w-5" />
              END CALL
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
