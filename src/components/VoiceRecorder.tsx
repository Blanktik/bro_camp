import { useState, useRef } from 'react';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onRecordingCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioBlob) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      deleteRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-gray-850 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`} />
          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
        </div>

        {!audioBlob && (
          <div className="flex gap-2">
            {!isRecording ? (
              <Button
                type="button"
                size="sm"
                onClick={startRecording}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Mic className="w-4 h-4 mr-1" />
                START RECORDING
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={stopRecording}
                className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
              >
                <Square className="w-4 h-4 mr-1" />
                STOP
              </Button>
            )}
          </div>
        )}

        {audioBlob && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={togglePlayback}
              className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={deleteRecording}
              className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              DELETE
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-white text-black hover:bg-gray-200"
            >
              USE THIS RECORDING
            </Button>
          </div>
        )}
      </div>

      {audioBlob && (
        <div className="pt-2 border-t border-gray-850">
          <p className="text-xs text-gray-500">
            Recording ready • {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {!audioBlob && !isRecording && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRecordingCancel}
          className="text-gray-500 hover:text-gray-400"
        >
          Cancel Voice Note
        </Button>
      )}
    </div>
  );
}
