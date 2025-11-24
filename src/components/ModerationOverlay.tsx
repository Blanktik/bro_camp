import { useEffect, useState } from 'react';
import { useModerationStatus } from '@/hooks/useModerationStatus';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { AlertTriangle, Ban, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

export function ModerationOverlay({ children }: { children: React.ReactNode }) {
  const { activeWarnings, activeBan, activeTimeout, refetch } = useModerationStatus();
  const { signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Check for new warnings
  useEffect(() => {
    if (activeWarnings.length > 0 && !activeWarnings[0].appeal_status) {
      setShowWarning(true);
    }
  }, [activeWarnings]);

  // Update timeout countdown
  useEffect(() => {
    if (!activeTimeout?.expires_at) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(activeTimeout.expires_at!);
      if (expires <= now) {
        refetch();
        return;
      }
      setTimeRemaining(formatDistanceToNow(expires, { addSuffix: true }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimeout, refetch]);

  const handleAcknowledgeWarning = async () => {
    setShowWarning(false);
  };

  const handleAppeal = async (moderationId: string) => {
    if (!appealText.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_moderation')
        .update({
          appeal_text: appealText,
          appeal_submitted_at: new Date().toISOString(),
          appeal_status: 'pending',
        })
        .eq('id', moderationId);

      if (error) throw error;

      toast.success('Appeal submitted successfully');
      setAppealText('');
      setAppealingId(null);
      setShowWarning(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Ban screen - full takeover
  if (activeBan) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-8">
        <div className="max-w-2xl w-full border border-red-600 p-8 animate-pulse-border-red relative">
          <div className="absolute inset-0 border border-red-600 animate-pulse-border-red" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 border border-red-600 animate-pulse-border-red" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Ban className="w-12 h-12 text-red-600" />
              <h1 className="text-4xl font-bold tracking-tight">ACCOUNT BANNED</h1>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-xs text-gray-500 mb-1">REASON</p>
                <p className="text-lg">{activeBan.reason}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-1">ISSUED AT</p>
                <p className="text-sm text-gray-400">{format(new Date(activeBan.issued_at), 'PPpp')}</p>
              </div>
            </div>

            {!activeBan.appeal_status ? (
              <div className="space-y-4">
                <p className="text-gray-400">If you believe this ban was issued in error, you may submit an appeal:</p>
                <Textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explain why this ban should be reconsidered..."
                  className="bg-transparent border-gray-850 focus:border-red-600 resize-none"
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAppeal(activeBan.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    SUBMIT APPEAL
                  </Button>
                  <Button
                    onClick={signOut}
                    variant="outline"
                    className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
                  >
                    SIGN OUT
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border border-yellow-600 bg-yellow-600/10">
                  <p className="text-yellow-600 font-bold mb-2">APPEAL STATUS: {activeBan.appeal_status.toUpperCase()}</p>
                  {activeBan.appeal_status === 'pending' && (
                    <p className="text-sm text-gray-400">Your appeal is being reviewed by administrators.</p>
                  )}
                </div>
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
                >
                  SIGN OUT
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Timeout overlay - grays out everything except sign out
  if (activeTimeout) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-30 grayscale">
          {children}
        </div>
        
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="max-w-2xl w-full border border-yellow-600 p-8 bg-black pointer-events-auto">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-12 h-12 text-yellow-600" />
              <h1 className="text-4xl font-bold tracking-tight">ACCOUNT TIMED OUT</h1>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-xs text-gray-500 mb-1">REASON</p>
                <p className="text-lg">{activeTimeout.reason}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-1">ISSUED AT</p>
                <p className="text-sm text-gray-400">{format(new Date(activeTimeout.issued_at), 'PPpp')}</p>
              </div>
            </div>

            {!activeTimeout.appeal_status && appealingId !== activeTimeout.id ? (
              <div className="space-y-4">
                <p className="text-gray-400">If you believe this timeout was issued in error, you may submit an appeal:</p>
                <Button
                  onClick={() => setAppealingId(activeTimeout.id)}
                  variant="outline"
                  className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-black"
                >
                  SUBMIT APPEAL
                </Button>
              </div>
            ) : appealingId === activeTimeout.id ? (
              <div className="space-y-4">
                <Textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explain why this timeout should be reconsidered..."
                  className="bg-transparent border-gray-850 focus:border-yellow-600 resize-none"
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAppeal(activeTimeout.id)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-black"
                  >
                    SUBMIT APPEAL
                  </Button>
                  <Button
                    onClick={() => setAppealingId(null)}
                    variant="outline"
                    className="border-gray-850"
                  >
                    CANCEL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-yellow-600 bg-yellow-600/10">
                <p className="text-yellow-600 font-bold mb-2">APPEAL STATUS: {activeTimeout.appeal_status?.toUpperCase()}</p>
                {activeTimeout.appeal_status === 'pending' && (
                  <p className="text-sm text-gray-400">Your appeal is being reviewed by administrators.</p>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-850">
              <Button
                onClick={signOut}
                variant="outline"
                className="border-gray-850 text-gray-400 hover:text-white hover:border-white w-full"
              >
                SIGN OUT
              </Button>
            </div>
          </div>
        </div>

        {activeTimeout.expires_at && (
          <div className="fixed bottom-4 right-4 z-50 p-4 border border-yellow-600 bg-black">
            <p className="text-xs text-gray-500 mb-1">TIME REMAINING</p>
            <p className="text-lg font-bold text-yellow-600">{timeRemaining}</p>
          </div>
        )}
      </div>
    );
  }

  // Warning popup
  if (showWarning && activeWarnings.length > 0 && !activeWarnings[0].appeal_status) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full border border-red-600 p-8 bg-black animate-pulse-border-red relative">
            <div className="absolute inset-0 border border-red-600 animate-pulse-border-red" style={{ animationDelay: '0.5s' }}></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-12 h-12 text-red-600" />
                <h1 className="text-4xl font-bold tracking-tight">WARNING ISSUED</h1>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-xs text-gray-500 mb-1">REASON</p>
                  <p className="text-lg">{activeWarnings[0].reason}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">ISSUED AT</p>
                  <p className="text-sm text-gray-400">{format(new Date(activeWarnings[0].issued_at), 'PPpp')}</p>
                </div>

                <div className="p-4 border border-gray-850 bg-gray-950">
                  <p className="text-sm text-gray-400">
                    You have received {activeWarnings.length} warning{activeWarnings.length > 1 ? 's' : ''}. 
                    Continued violations may result in temporary restrictions or account suspension.
                  </p>
                </div>
              </div>

              {!appealingId ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleAcknowledgeWarning}
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    YES, I AGREE - ACKNOWLEDGE WARNING
                  </Button>
                  <Button
                    onClick={() => setAppealingId(activeWarnings[0].id)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    THIS IS A MISTAKE - APPEAL
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    placeholder="Explain why you believe this warning was issued in error..."
                    className="bg-transparent border-gray-850 focus:border-red-600 resize-none"
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAppeal(activeWarnings[0].id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      SUBMIT APPEAL
                    </Button>
                    <Button
                      onClick={() => {
                        setAppealingId(null);
                        setAppealText('');
                      }}
                      variant="outline"
                      className="border-gray-850"
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
