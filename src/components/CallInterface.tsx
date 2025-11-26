import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Video, VideoOff, Monitor, MonitorOff, Phone } from 'lucide-react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';

interface CallInterfaceProps {
  callId: string;
  isInitiator: boolean;
  callTitle: string;
  participantName: string;
  onEndCall: () => void;
  showVideoControls?: boolean;
}

export function CallInterface({
  callId,
  isInitiator,
  callTitle,
  participantName,
  onEndCall,
  showVideoControls = true,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    toggleVideo,
    toggleScreenShare,
    endCall,
  } = useWebRTCCall({
    callId,
    isInitiator,
    onCallEnded: onEndCall,
  });

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-850 p-6">
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="bg-white text-black px-2">CALL</span> IN PROGRESS
        </h2>
        <p className="text-gray-400 mt-2">{callTitle}</p>
        <p className="text-sm text-gray-500">
          {participantName} • {connectionState}
        </p>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative p-6">
        {/* Remote Video (main) */}
        <div className="h-full w-full border border-gray-850 bg-black relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">👤</div>
                <p className="text-gray-400">Waiting for {participantName}...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (picture-in-picture) */}
        {(isVideoEnabled || isScreenSharing) && (
          <div className="absolute bottom-6 right-6 w-64 h-48 border border-white bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-gray-850 p-6">
        <div className="flex items-center justify-center gap-4">
          {showVideoControls && (
            <>
              <Button
                onClick={toggleVideo}
                variant={isVideoEnabled ? 'default' : 'outline'}
                size="lg"
                className="gap-2"
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                {isVideoEnabled ? 'Camera On' : 'Camera Off'}
              </Button>

              <Button
                onClick={toggleScreenShare}
                variant={isScreenSharing ? 'default' : 'outline'}
                size="lg"
                className="gap-2"
              >
                {isScreenSharing ? <Monitor className="h-5 w-5" /> : <MonitorOff className="h-5 w-5" />}
                {isScreenSharing ? 'Sharing' : 'Share Screen'}
              </Button>
            </>
          )}

          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700 border-red-600"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
            End Call
          </Button>
        </div>
      </div>
    </div>
  );
}
