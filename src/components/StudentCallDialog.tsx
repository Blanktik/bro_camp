import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Phone, AlertTriangle } from 'lucide-react';
import { useCallTimeout } from '@/hooks/useCallTimeout';
import { audioManager } from '@/utils/audioNotifications';

interface StudentCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallStarted: (callId: string, title: string, adminId: string) => void;
}

export function StudentCallDialog({ open, onOpenChange, onCallStarted }: StudentCallDialogProps) {
  const [title, setTitle] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [hasSeenWarning, setHasSeenWarning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has seen warning before
    const seen = localStorage.getItem('brocamp-call-warning-seen');
    setHasSeenWarning(seen === 'true');
  }, []);

  const handleCallTimeout = async () => {
    if (!pendingCallId) return;
    
    try {
      await supabase
        .from('calls')
        .update({ status: 'missed' })
        .eq('id', pendingCallId);
      audioManager.play('callEnd');
    } catch (error) {
      console.error('Error updating call status:', error);
    }
    
    setPendingCallId(null);
    toast.error('No admin answered your call');
  };

  useCallTimeout(pendingCallId || '', handleCallTimeout);

  // Listen for when admin answers
  useEffect(() => {
    if (!pendingCallId) return;

    const channel = supabase
      .channel(`call-status-${pendingCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${pendingCallId}`,
        },
        (payload: any) => {
          if (payload.new.status === 'active' && payload.new.admin_id) {
            onCallStarted(pendingCallId, title, payload.new.admin_id);
            onOpenChange(false);
            setTitle('');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingCallId, title, onCallStarted, onOpenChange]);

  const handleStartCall = async () => {
    if (!hasSeenWarning) {
      setShowWarning(true);
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a call title');
      audioManager.play('error');
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to make a call');
        audioManager.play('error');
        return;
      }

      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          student_id: user.id,
          title: title.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setPendingCallId(call.id);
      audioManager.play('outgoingCall');
      toast.success('Calling admins...');
    } catch (error) {
      console.error('Error creating call:', error);
      toast.error('Failed to start call');
      audioManager.play('error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleWarningAccept = () => {
    localStorage.setItem('brocamp-call-warning-seen', 'true');
    setHasSeenWarning(true);
    setShowWarning(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              <span className="bg-white text-black px-2">CALL</span> ADMIN
            </DialogTitle>
            <DialogDescription>
              Enter a title for your call. An admin will join as soon as possible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="call-title">Call Title</Label>
              <Input
                id="call-title"
                placeholder="e.g., Technical Issue with Assignment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-gray-850"
                maxLength={100}
              />
              <p className="text-xs text-gray-500">
                Be specific so admins know what to expect
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                if (pendingCallId) {
                  await supabase
                    .from('calls')
                    .update({ status: 'missed' })
                    .eq('id', pendingCallId);
                  setPendingCallId(null);
                  audioManager.play('callEnd');
                }
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartCall}
              disabled={!title.trim() || isCreating}
              className="flex-1 gap-2"
            >
              <Phone className="h-4 w-4" />
              {isCreating ? 'Starting...' : 'Start Call'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="border-red-600 animate-pulse-border-red">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <AlertDialogTitle className="text-2xl">
                <span className="bg-red-600 text-white px-2">WARNING</span>
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              <p className="font-medium text-white">
                Please read carefully before proceeding:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Only call for genuine issues or questions</li>
                <li>Admin time is valuable - don't waste it</li>
                <li>Be prepared with relevant information</li>
                <li>Misuse may result in moderation action</li>
              </ul>
              <p className="text-sm text-gray-400">
                This warning will only show once. You are responsible for using this feature appropriately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowWarning(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWarningAccept}
              className="flex-1 bg-red-600 hover:bg-red-700 border-red-600"
            >
              I Understand
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
