import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WebRTCConnection } from '@/utils/webrtc';
import { toast } from 'sonner';

interface UseWebRTCCallProps {
  callId: string;
  isInitiator: boolean;
  otherUserId: string;
  onCallEnded?: () => void;
}

export const useWebRTCCall = ({ callId, isInitiator, otherUserId, onCallEnded }: UseWebRTCCallProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const signalChannelRef = useRef<any>(null);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    console.log('Received remote stream');
    setRemoteStream(stream);
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate) => {
    console.log('Sending ICE candidate');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('call_signals').insert({
        call_id: callId,
        from_user_id: user.id,
        to_user_id: otherUserId,
        signal_type: 'ice-candidate',
        signal_data: candidate.toJSON() as any,
      });
    }
  }, [callId, otherUserId]);

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    console.log('Connection state changed:', state);
    setConnectionState(state);
    
    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      toast.error('Call connection lost');
      onCallEnded?.();
    }
  }, [onCallEnded]);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        webrtcRef.current = new WebRTCConnection(
          handleRemoteStream,
          handleIceCandidate,
          handleConnectionStateChange
        );

        await webrtcRef.current.initialize();
        const stream = await webrtcRef.current.startAudio();
        setLocalStream(stream);

        // Set up signaling channel
        signalChannelRef.current = supabase
          .channel(`call-signals-${callId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'call_signals',
              filter: `call_id=eq.${callId}`,
            },
            async (payload: any) => {
              const signal = payload.new;
              const { data: { user } } = await supabase.auth.getUser();
              
              if (signal.from_user_id === user?.id) return;

              console.log('Received signal:', signal.signal_type);

              if (signal.signal_type === 'offer') {
                await webrtcRef.current?.setRemoteDescription(signal.signal_data);
                const answer = await webrtcRef.current?.createAnswer();
                
                if (answer && user) {
                  await supabase.from('call_signals').insert({
                    call_id: callId,
                    from_user_id: user.id,
                    to_user_id: signal.from_user_id,
                    signal_type: 'answer',
                    signal_data: answer as any,
                  });
                }
              } else if (signal.signal_type === 'answer') {
                await webrtcRef.current?.setRemoteDescription(signal.signal_data);
              } else if (signal.signal_type === 'ice-candidate') {
                await webrtcRef.current?.addIceCandidate(signal.signal_data);
              }
            }
          )
          .subscribe();

        // If initiator, wait for call to be active then create offer
        if (isInitiator) {
          // Wait for call status to be 'active'
          const checkCallStatus = async () => {
            const { data: call } = await supabase
              .from('calls')
              .select('status')
              .eq('id', callId)
              .single();
            
            if (call?.status === 'active') {
              await new Promise(resolve => setTimeout(resolve, 500));
              const offer = await webrtcRef.current?.createOffer();
              const { data: { user } } = await supabase.auth.getUser();
              
              if (offer && user) {
                await supabase.from('call_signals').insert({
                  call_id: callId,
                  from_user_id: user.id,
                  to_user_id: otherUserId,
                  signal_type: 'offer',
                  signal_data: offer as any,
                });
              }
            } else {
              setTimeout(checkCallStatus, 500);
            }
          };
          
          checkCallStatus();
        }
      } catch (error) {
        console.error('Error initializing call:', error);
        toast.error('Failed to initialize call');
        onCallEnded?.();
      }
    };

    initializeCall();

    return () => {
      webrtcRef.current?.close();
      signalChannelRef.current?.unsubscribe();
    };
  }, [callId, isInitiator, otherUserId, handleRemoteStream, handleIceCandidate, handleConnectionStateChange, onCallEnded]);

  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoEnabled) {
        webrtcRef.current?.stopVideo();
        setIsVideoEnabled(false);
      } else {
        await webrtcRef.current?.startVideo();
        setIsVideoEnabled(true);
        
        await supabase
          .from('calls')
          .update({ has_video: true })
          .eq('id', callId);
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Failed to toggle video');
    }
  }, [isVideoEnabled, callId]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        webrtcRef.current?.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcRef.current?.startScreenShare();
        setIsScreenSharing(true);
        
        await supabase
          .from('calls')
          .update({ has_screen_share: true })
          .eq('id', callId);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen share');
    }
  }, [isScreenSharing, callId]);

  const endCall = useCallback(async () => {
    webrtcRef.current?.close();
    signalChannelRef.current?.unsubscribe();
    onCallEnded?.();
  }, [onCallEnded]);

  return {
    localStream,
    remoteStream,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    toggleVideo,
    toggleScreenShare,
    endCall,
  };
};
