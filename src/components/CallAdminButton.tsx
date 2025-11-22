import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function CallAdminButton() {
  const [open, setOpen] = useState(false);
  const [callTitle, setCallTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInitiateCall = async () => {
    if (!callTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your call",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get user profile for name and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from('calls')
        .insert({
          student_id: user?.id,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || user?.email || 'No email',
          call_title: callTitle,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Call Initiated",
        description: "An admin will attend to your call shortly",
      });

      setCallTitle('');
      setOpen(false);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Error",
        description: "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Phone className="h-4 w-4" />
          Call Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Call an Admin</DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="border border-yellow-500/20 bg-yellow-500/5 p-3 rounded text-sm text-yellow-500">
              ⚠️ WARNING: Only call for important matters. Do not waste admin time with non-urgent issues.
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="call-title">Call Title *</Label>
            <Input
              id="call-title"
              placeholder="Brief description of your issue..."
              value={callTitle}
              onChange={(e) => setCallTitle(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>
        <Button onClick={handleInitiateCall} disabled={loading}>
          {loading ? 'Initiating...' : 'Initiate Call'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
